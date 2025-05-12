
import { createSupabaseClient } from "./supabaseClient.ts";
import { generateQueryEmbedding } from "./embeddings.ts";

interface QueryOptions {
  query: string;
  limit: number;
  useEmbeddings: boolean;
  matchThreshold?: number;
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
}

/**
 * Process a knowledge base query using vector or text search
 */
export async function processQuery(options: QueryOptions): Promise<FormattedResult[]> {
  const { 
    query, 
    limit = 5, 
    useEmbeddings = true,
    matchThreshold = 0.5 // Lower default threshold for better recall
  } = options;
  
  const supabase = createSupabaseClient();
  
  let results: KnowledgeChunk[];
  
  if (useEmbeddings) {
    try {
      // Get embeddings for the query
      const embedding = await generateQueryEmbedding(query);
  
      // Query using vector similarity search
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
  
      results = vectorResults || [];
      
      // If no results with vector search, fall back to text search
      if (results.length === 0) {
        console.log(`No vector results found, falling back to text search for: ${query}`);
        const { data: textResults, error: textError } = await supabase
          .from('knowledge_chunks')
          .select('*')
          .textSearch('content', query)
          .limit(limit);
  
        if (textError) {
          throw textError;
        }
  
        results = textResults || [];
      }
    } catch (error) {
      console.error("Error in vector search:", error);
      // Fallback to text search on error
      const { data: textResults, error: textError } = await supabase
        .from('knowledge_chunks')
        .select('*')
        .textSearch('content', query)
        .limit(limit);

      if (textError) {
        throw textError;
      }

      results = textResults || [];
    }
  } else {
    // Direct text search if embeddings aren't used
    const { data: textResults, error: textError } = await supabase
      .from('knowledge_chunks')
      .select('*')
      .textSearch('content', query)
      .limit(limit);

    if (textError) {
      throw textError;
    }

    results = textResults || [];
  }

  // Format results for consistency
  return results.map(chunk => {
    // Get file URL if it exists
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
      metadata: chunk.metadata || {}
    };
  });
}
