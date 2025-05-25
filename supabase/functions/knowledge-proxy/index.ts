
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-execution-id, x-provider-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to generate embeddings
async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-ada-002'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }
    
    const result = await response.json();
    return result.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Helper function to sanitize text query
function sanitizeTextQuery(query: string): string {
  if (!query || query.trim() === '') {
    return '';
  }
  
  let sanitized = query
    .replace(/['\\:&|!()]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
    
  if (sanitized === '') {
    return '';
  }
  
  const words = sanitized.split(' ').filter(word => word.length > 0);
  
  if (words.length === 0) {
    return '';
  }
  
  if (words.length === 1) {
    return `${words[0]}:*`;
  }
  
  return words.map(word => `${word}:*`).join(' & ');
}

// Process knowledge search query
async function processKnowledgeQuery(options: {
  query: string;
  limit: number;
  useEmbeddings: boolean;
  matchThreshold: number;
  includeNodes: boolean;
}) {
  const { 
    query, 
    limit = 5, 
    useEmbeddings = true,
    matchThreshold = 0.5,
    includeNodes = false
  } = options;
  
  let chunkResults: any[] = [];
  let nodeResults: any[] = [];
  
  try {
    // Search knowledge chunks
    let chunksData: any[] = [];
    
    if (useEmbeddings) {
      try {
        const embedding = await generateQueryEmbedding(query);
    
        const { data: vectorResults, error: vectorError } = await supabase.rpc(
          'match_knowledge_chunks',
          {
            query_embedding: embedding,
            match_threshold: matchThreshold,
            match_count: limit
          }
        );
    
        if (vectorError) {
          console.error('Vector search error:', vectorError);
          throw vectorError;
        }
    
        chunksData = vectorResults || [];
        console.log(`Vector search found ${chunksData.length} results`);
        
        if (chunksData.length === 0) {
          console.log(`No vector results found, falling back to text search for: ${query}`);
          
          const sanitizedQuery = sanitizeTextQuery(query);
          
          if (sanitizedQuery) {
            const { data: textResults, error: textError } = await supabase
              .from('knowledge_chunks')
              .select('*')
              .textSearch('content', sanitizedQuery)
              .limit(limit);
        
            if (!textError) {
              chunksData = textResults || [];
              console.log(`Text search found ${chunksData.length} results`);
            } else {
              console.error('Text search error:', textError);
            }
          }
        }
      } catch (error) {
        console.error("Error in vector search:", error);
        
        const sanitizedQuery = sanitizeTextQuery(query);
        
        if (sanitizedQuery) {
          const { data: textResults, error: textError } = await supabase
            .from('knowledge_chunks')
            .select('*')
            .textSearch('content', sanitizedQuery)
            .limit(limit);

          if (!textError) {
            chunksData = textResults || [];
            console.log(`Fallback text search found ${chunksData.length} results`);
          } else {
            console.error('Fallback text search error:', textError);
          }
        }
      }
    } else {
      const sanitizedQuery = sanitizeTextQuery(query);
      
      if (sanitizedQuery) {
        const { data: textResults, error: textError } = await supabase
          .from('knowledge_chunks')
          .select('*')
          .textSearch('content', sanitizedQuery)
          .limit(limit);

        if (!textError) {
          chunksData = textResults || [];
          console.log(`Direct text search found ${chunksData.length} results`);
        } else {
          console.error('Direct text search error:', textError);
        }
      }
    }

    chunkResults = chunksData.map(chunk => {
      let fileUrl = '';
      if (chunk.file_path) {
        const { data } = supabase.storage
          .from('knowledge_files')
          .getPublicUrl(chunk.file_path);
        fileUrl = data.publicUrl;
      }
      
      return {
        title: chunk.title || 'Knowledge Document',
        link: chunk.source_url || fileUrl || '',
        snippet: chunk.content,
        source: chunk.original_file_type 
          ? `File: ${chunk.original_file_type.toUpperCase()}`
          : 'Internal Knowledge Base',
        date: new Date(chunk.created_at).toISOString().split('T')[0],
        relevanceScore: chunk.similarity || 1.0,
        fileType: chunk.original_file_type || null,
        filePath: chunk.file_path || null,
        fileUrl: fileUrl || null,
        sourceType: 'knowledge',
        contentType: chunk.original_file_type || 'document',
        metadata: chunk.metadata || {}
      };
    });

  } catch (error) {
    console.error("Error processing knowledge chunks search:", error);
  }
  
  // Search knowledge nodes if requested
  if (includeNodes) {
    try {
      const sanitizedQuery = sanitizeTextQuery(query);
      
      if (sanitizedQuery) {
        const { data: nodes, error } = await supabase
          .from('knowledge_nodes')
          .select('*')
          .or(`title.fts.${sanitizedQuery},description.fts.${sanitizedQuery}`)
          .limit(limit);
          
        if (!error && nodes) {
          nodeResults = nodes.map((node: any) => {
            let nodeIconType = '';
            switch(node.type) {
              case 'rule': 
                nodeIconType = 'Rule';
                break;
              case 'concept':
                nodeIconType = 'Concept';
                break;
              case 'pattern':
                nodeIconType = 'Pattern';
                break;
              case 'insight':
                nodeIconType = 'Insight';
                break;
              default:
                nodeIconType = 'Knowledge Node';
            }
            
            return {
              title: node.title,
              link: '',
              snippet: node.description,
              source: `Knowledge Node: ${nodeIconType}`,
              date: new Date(node.created_at).toISOString().split('T')[0],
              relevanceScore: node.similarity || node.confidence || 0.8,
              fileType: null,
              filePath: null,
              fileUrl: null,
              sourceType: 'node',
              contentType: 'knowledge-node',
              nodeType: node.type,
              confidence: node.confidence,
              metadata: {
                ...node.metadata,
                domain_id: node.domain_id,
                discovered_in_loop: node.discovered_in_loop
              }
            };
          });
          console.log(`Knowledge nodes search found ${nodeResults.length} results`);
        } else if (error) {
          console.error("Error searching knowledge nodes:", error);
        }
      }
    } catch (error) {
      console.error("Error processing knowledge nodes search:", error);
    }
  }
  
  const combinedResults = [...chunkResults, ...nodeResults]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit * 2);

  console.log(`Total combined results: ${combinedResults.length}`);
  return combinedResults;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const requestBody = await req.json();
    console.log('Received request body:', JSON.stringify(requestBody));
    
    // Handle both formats: direct parameters or nested action/parameters structure
    let parameters;
    if (requestBody.parameters) {
      // New format from mcpService
      parameters = requestBody.parameters;
    } else {
      // Direct format - use the entire body as parameters
      parameters = requestBody;
    }
    
    const executionId = requestBody.executionId;
    
    console.log(`Processing knowledge request`);
    console.log(`Execution ID: ${executionId}`);
    console.log(`Parameters:`, JSON.stringify(parameters));
    
    // Extract parameters for knowledge search
    const { 
      query, 
      sources = [],
      limit = 5,
      includeNodes = true,
      matchThreshold = 0.5,
      useEmbeddings = true
    } = parameters;
    
    if (!query) {
      throw new Error('Query parameter is required');
    }

    console.log(`Searching for: "${query}" with limit: ${limit}, includeNodes: ${includeNodes}, useEmbeddings: ${useEmbeddings}`);

    // Process the knowledge search using our local implementation
    const results = await processKnowledgeQuery({
      query,
      limit: Number(limit),
      useEmbeddings,
      matchThreshold,
      includeNodes
    });

    console.log(`Knowledge search completed. Found ${results.length} results.`);

    // Record this execution for analytics
    if (executionId) {
      const { error: logError } = await supabase.from('mcp_executions')
        .update({
          status: 'completed',
          result: { results },
          execution_time: Date.now() - Date.now() // placeholder - would need start time
        })
        .eq('id', executionId);
      
      if (logError) {
        console.log('Non-critical error logging execution:', logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in knowledge-proxy function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during knowledge request',
        status: 'failed',
        data: null 
      }),
      { 
        status: 200, // Return 200 even for errors to allow client-side handling
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
