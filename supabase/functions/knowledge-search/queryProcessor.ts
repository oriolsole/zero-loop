
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

export async function processQuery(options: QueryOptions): Promise<FormattedResult[]> {
  const { 
    query, 
    limit = 5, 
    useEmbeddings = true,
    matchThreshold = 0.5,
    includeNodes = false
  } = options;
  
  const supabase = createSupabaseClient();
  
  let chunkResults: FormattedResult[] = [];
  let nodeResults: FormattedResult[] = [];
  
  try {
    let chunksData: KnowledgeChunk[] = [];
    
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
          throw vectorError;
        }
    
        chunksData = vectorResults || [];
        
        if (chunksData.length === 0) {
          console.log(`No vector results found, falling back to text search for: ${query}`);
          
          const sanitizedQuery = sanitizeTextQuery(query);
          
          if (!sanitizedQuery) {
            console.log("Query was sanitized to empty string, skipping text search");
          } else {
            try {
              const { data: textResults, error: textError } = await supabase
                .from('knowledge_chunks')
                .select('*')
                .textSearch('content', sanitizedQuery)
                .limit(limit);
          
              if (textError) {
                console.error("Text search error:", textError);
                throw textError;
              }
          
              chunksData = textResults || [];
            } catch (textSearchError) {
              console.error("Failed to perform text search:", textSearchError);
            }
          }
        }
      } catch (error) {
        console.error("Error in vector search:", error);
        
        const sanitizedQuery = sanitizeTextQuery(query);
        
        if (!sanitizedQuery) {
          console.log("Query was sanitized to empty string, skipping text search");
        } else {
          try {
            const { data: textResults, error: textError } = await supabase
              .from('knowledge_chunks')
              .select('*')
              .textSearch('content', sanitizedQuery)
              .limit(limit);

            if (textError) {
              console.error("Text search error:", textError);
              throw textError;
            }

            chunksData = textResults || [];
          } catch (textSearchError) {
            console.error("Failed to perform text search as fallback:", textSearchError);
          }
        }
      }
    } else {
      const sanitizedQuery = sanitizeTextQuery(query);
      
      if (!sanitizedQuery) {
        console.log("Query was sanitized to empty string, skipping text search");
      } else {
        try {
          const { data: textResults, error: textError } = await supabase
            .from('knowledge_chunks')
            .select('*')
            .textSearch('content', sanitizedQuery)
            .limit(limit);

          if (textError) {
            console.error("Text search error:", textError);
            throw textError;
          }

          chunksData = textResults || [];
        } catch (textSearchError) {
          console.error("Failed to perform text search:", textSearchError);
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
  
  if (includeNodes) {
    try {
      nodeResults = await searchKnowledgeNodes(supabase, query, limit);
    } catch (error) {
      console.error("Error processing knowledge nodes search:", error);
    }
  }
  
  const combinedResults = [...chunkResults, ...nodeResults]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit * 2);

  return combinedResults;
}
