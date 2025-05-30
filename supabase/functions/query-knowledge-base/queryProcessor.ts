
import { createSupabaseClient } from "./supabaseClient.ts";
import { generateQueryEmbedding } from "./embeddings.ts";

interface QueryOptions {
  query: string;
  limit: number;
  useEmbeddings: boolean;
  matchThreshold?: number;
  includeNodes?: boolean;
}

interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  domain_id?: string;
  source_url?: string | null;
  file_path?: string | null;
  original_file_type?: string | null;
  metadata?: any;
  created_at: string;
  similarity?: number;
}

interface KnowledgeNode {
  id: string;
  title: string;
  description: string;
  type: string;
  domain_id: string;
  created_at: string;
  similarity?: number;
  confidence: number;
  metadata?: any;
  discovered_in_loop?: number;
}

export interface FormattedResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  date: string;
  relevanceScore: number;
  fileType: string | null;
  filePath: string | null;
  fileUrl: string | null;
  metadata: any;
  sourceType?: 'knowledge' | 'web' | 'node';
  contentType?: string;
  nodeType?: string;
  confidence?: number;
}

function sanitizeTextQuery(query: string): string {
  if (!query || query.trim() === '') {
    return '';
  }
  
  // Improved text search - use simpler approach for better results
  const cleaned = query
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  return cleaned;
}

async function performVectorSearch(
  supabase: any,
  query: string,
  threshold: number,
  limit: number
): Promise<KnowledgeChunk[]> {
  try {
    const embedding = await generateQueryEmbedding(query);
    console.log(`Vector search with threshold: ${threshold}`);

    const { data: vectorResults, error: vectorError } = await supabase.rpc(
      'match_knowledge_chunks',
      {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: limit * 2
      }
    );

    if (vectorError) {
      console.error("Vector search error:", vectorError);
      return [];
    }

    const results = vectorResults || [];
    console.log(`Vector search found ${results.length} results at threshold ${threshold}`);
    return results;
  } catch (error) {
    console.error("Error in vector search:", error);
    return [];
  }
}

async function performTextSearch(
  supabase: any,
  query: string,
  limit: number
): Promise<KnowledgeChunk[]> {
  try {
    const sanitizedQuery = sanitizeTextQuery(query);
    
    if (!sanitizedQuery) {
      return [];
    }

    console.log(`Text search with query: "${sanitizedQuery}"`);

    // Use ilike for partial matching - more permissive than full-text search
    const { data: textResults, error: textError } = await supabase
      .from('knowledge_chunks')
      .select('*')
      .or(`title.ilike.%${sanitizedQuery}%,content.ilike.%${sanitizedQuery}%`)
      .limit(limit);

    if (textError) {
      console.error("Text search error:", textError);
      return [];
    }

    const results = textResults || [];
    console.log(`Text search found ${results.length} results`);
    return results;
  } catch (error) {
    console.error("Error in text search:", error);
    return [];
  }
}

async function searchKnowledgeNodes(
  supabase: any, 
  query: string, 
  limit: number
): Promise<FormattedResult[]> {
  try {
    const sanitizedQuery = sanitizeTextQuery(query);
    
    if (!sanitizedQuery) {
      return [];
    }
    
    const { data: nodes, error } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
      .limit(limit);
      
    if (error) {
      console.error("Error searching knowledge nodes:", error);
      return [];
    }
    
    if (!nodes || nodes.length === 0) {
      return [];
    }
    
    return nodes.map((node: KnowledgeNode) => {
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
  } catch (error) {
    console.error("Error processing knowledge node search:", error);
    return [];
  }
}

export async function processQuery(options: QueryOptions): Promise<FormattedResult[]> {
  const { 
    query, 
    limit = 5, 
    useEmbeddings = true,
    matchThreshold = 0.2,
    includeNodes = false
  } = options;
  
  console.log(`Processing query: "${query}" with initial threshold: ${matchThreshold}`);
  
  const supabase = createSupabaseClient();
  
  let chunkResults: FormattedResult[] = [];
  let nodeResults: FormattedResult[] = [];
  
  // Progressive search with vector embeddings
  if (useEmbeddings) {
    const thresholds = [matchThreshold, 0.15, 0.1]; // Progressive relaxation
    
    for (const threshold of thresholds) {
      const vectorResults = await performVectorSearch(supabase, query, threshold, limit);
      
      if (vectorResults.length > 0) {
        console.log(`Found ${vectorResults.length} results with threshold ${threshold}`);
        
        // Format vector results
        chunkResults = vectorResults.map(chunk => {
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
            snippet: chunk.content.substring(0, 300) + '...',
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
        
        break; // Stop if we found results
      }
      
      console.log(`No results with threshold ${threshold}, trying next threshold`);
    }
  }
  
  // Text search fallback if vector search failed or wasn't used
  if (chunkResults.length === 0) {
    console.log('Falling back to text search');
    const textResults = await performTextSearch(supabase, query, limit);
    
    if (textResults.length > 0) {
      chunkResults = textResults.map(chunk => {
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
          snippet: chunk.content.substring(0, 300) + '...',
          source: chunk.original_file_type 
            ? `File: ${chunk.original_file_type.toUpperCase()}`
            : 'Internal Knowledge Base',
          date: new Date(chunk.created_at).toISOString().split('T')[0],
          relevanceScore: 0.7, // Fixed score for text search results
          fileType: chunk.original_file_type || null,
          filePath: chunk.file_path || null,
          fileUrl: fileUrl || null,
          sourceType: 'knowledge',
          contentType: chunk.original_file_type || 'document',
          metadata: chunk.metadata || {}
        };
      });
    }
  }
  
  // Search knowledge nodes if requested
  if (includeNodes) {
    try {
      nodeResults = await searchKnowledgeNodes(supabase, query, limit);
      console.log(`Node search found ${nodeResults.length} results`);
    } catch (error) {
      console.error("Error processing knowledge nodes search:", error);
    }
  }
  
  // Combine and sort results
  const combinedResults = [...chunkResults, ...nodeResults]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit * 2);

  console.log(`Returning ${combinedResults.length} total results for query: "${query}"`);
  return combinedResults;
}
