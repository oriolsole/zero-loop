
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

/**
 * Simple text query sanitization for PostgreSQL
 */
function sanitizeTextQuery(query: string): string {
  if (!query || query.trim() === '') {
    return '';
  }
  
  // Simple sanitization for PostgreSQL full-text search
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

/**
 * Simple knowledge nodes search
 */
async function searchKnowledgeNodes(
  supabase: any, 
  query: string, 
  limit: number
): Promise<FormattedResult[]> {
  try {
    const sanitizedQuery = sanitizeTextQuery(query);
    
    if (!sanitizedQuery) {
      console.log("Query was sanitized to empty string, skipping node search");
      return [];
    }
    
    const { data: nodes, error } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .or(`title.fts.${sanitizedQuery},description.fts.${sanitizedQuery}`)
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

/**
 * Simplified query processing - let semantic search do the heavy lifting
 */
export async function processQuery(options: QueryOptions): Promise<FormattedResult[]> {
  const { 
    query, 
    limit = 5, 
    useEmbeddings = true,
    matchThreshold = 0.3,
    includeNodes = false
  } = options;
  
  console.log(`Processing query: "${query}" with threshold: ${matchThreshold}`);
  
  const supabase = createSupabaseClient();
  
  let chunkResults: FormattedResult[] = [];
  let nodeResults: FormattedResult[] = [];
  
  // Get results from knowledge chunks
  try {
    let chunksData: KnowledgeChunk[] = [];
    
    if (useEmbeddings) {
      try {
        // Use semantic search with embeddings
        const embedding = await generateQueryEmbedding(query);
        console.log(`Generated embedding for: "${query}"`);
    
        const { data: vectorResults, error: vectorError } = await supabase.rpc(
          'match_knowledge_chunks',
          {
            query_embedding: embedding,
            match_threshold: matchThreshold,
            match_count: limit * 2
          }
        );
    
        if (vectorError) {
          console.error("Vector search error:", vectorError);
          throw vectorError;
        }
    
        chunksData = vectorResults || [];
        console.log(`Vector search found ${chunksData.length} results`);
        
      } catch (error) {
        console.error("Error in vector search:", error);
        
        // Fallback to text search
        const sanitizedQuery = sanitizeTextQuery(query);
        if (sanitizedQuery) {
          try {
            const { data: textResults, error: textError } = await supabase
              .from('knowledge_chunks')
              .select('*')
              .textSearch('content', sanitizedQuery)
              .limit(limit);

            if (!textError) {
              chunksData = textResults || [];
              console.log(`Text search fallback found ${chunksData.length} results`);
            }
          } catch (textSearchError) {
            console.error("Failed to perform text search as fallback:", textSearchError);
          }
        }
      }
    } else {
      // Text search only
      const sanitizedQuery = sanitizeTextQuery(query);
      if (sanitizedQuery) {
        try {
          const { data: textResults, error: textError } = await supabase
            .from('knowledge_chunks')
            .select('*')
            .textSearch('content', sanitizedQuery)
            .limit(limit);

          if (!textError) {
            chunksData = textResults || [];
            console.log(`Text search found ${chunksData.length} results`);
          }
        } catch (textSearchError) {
          console.error("Failed to perform text search:", textSearchError);
        }
      }
    }

    // Format chunk results
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

  console.log(`Returning ${combinedResults.length} total results`);
  return combinedResults;
}
