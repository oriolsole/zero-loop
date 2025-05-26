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
 * Extracts quoted terms from a query string
 */
function extractQuotedTerms(query: string): string[] {
  const quotedMatches = query.match(/"([^"]+)"/g);
  return quotedMatches ? quotedMatches.map(match => match.replace(/"/g, '')) : [];
}

/**
 * Enhanced search term extraction from conversational queries
 */
function extractSearchTerms(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  // First, try to extract quoted terms - these are usually the most important
  const quotedTerms = extractQuotedTerms(query);
  if (quotedTerms.length > 0) {
    return quotedTerms.join(' ');
  }
  
  // Clean the query
  let cleaned = query.toLowerCase().trim();
  
  // Remove common conversational prefixes and suffixes
  const conversationalPrefixes = [
    'can you search for',
    'can you search',
    'can you find',
    'can you look for',
    'search for',
    'search',
    'find',
    'look for',
    'lookup',
    'get information about',
    'information about',
    'tell me about',
    'what is',
    'who is',
    'about'
  ];
  
  const conversationalSuffixes = [
    'in our knowledge base',
    'in the knowledge base',
    'in our database',
    'in the database',
    'please',
    'thanks',
    'thank you'
  ];
  
  // Remove prefixes
  for (const prefix of conversationalPrefixes) {
    const pattern = new RegExp(`^${prefix}\\s+`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove suffixes
  for (const suffix of conversationalSuffixes) {
    const pattern = new RegExp(`\\s+${suffix}$`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove question marks and extra punctuation at the end
  cleaned = cleaned.replace(/[?!.]+$/, '').trim();
  
  // If we're left with nothing meaningful, try to extract the most important words
  if (!cleaned || cleaned.length < 2) {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'our', 'can', 'you'];
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return words.join(' ');
  }
  
  return cleaned;
}

/**
 * Cleans and preprocesses search queries to improve matching
 */
function cleanSearchQuery(query: string): string {
  if (!query || query.trim() === '') {
    return '';
  }
  
  // First try to extract the actual search terms
  const extractedTerms = extractSearchTerms(query);
  if (extractedTerms && extractedTerms.trim()) {
    return extractedTerms.trim();
  }
  
  // Fallback to basic cleaning
  let cleaned = query.toLowerCase().trim();
  
  const searchPrefixes = [
    'search for',
    'search',
    'find',
    'look for',
    'lookup',
    'get information about',
    'information about',
    'tell me about',
    'what is',
    'who is',
    'about'
  ];
  
  for (const prefix of searchPrefixes) {
    const pattern = new RegExp(`^${prefix}\\s+`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned.trim();
}

/**
 * Sanitizes and formats a text query for PostgreSQL's tsquery
 */
function sanitizeTextQuery(query: string): string {
  if (!query || query.trim() === '') {
    return '';
  }
  
  // Clean the query first
  const cleanedQuery = cleanSearchQuery(query);
  if (!cleanedQuery) {
    return '';
  }
  
  // Remove any special characters that might break tsquery
  let sanitized = cleanedQuery
    .replace(/['\\:&|!()]/g, ' ')  // Remove tsquery special chars
    .trim()
    .replace(/\s+/g, ' ');         // Normalize whitespace
  
  if (sanitized === '') {
    return '';
  }
  
  // Split into words and filter out common stop words
  const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const words = sanitized.split(' ')
    .filter(word => word.length > 2 && !stopWords.includes(word.toLowerCase()));
  
  if (words.length === 0) {
    return '';
  }
  
  // For single words, add :* for prefix matching
  if (words.length === 1) {
    return `${words[0]}:*`;
  }
  
  // For multiple words, connect with & and add :* to each
  return words.map(word => `${word}:*`).join(' & ');
}

/**
 * Search for knowledge nodes that match the query
 */
async function searchKnowledgeNodes(
  supabase: any, 
  query: string, 
  limit: number
): Promise<FormattedResult[]> {
  try {
    // Clean the query before searching
    const cleanedQuery = cleanSearchQuery(query);
    if (!cleanedQuery) {
      console.log("Query was cleaned to empty string, skipping node search");
      return [];
    }
    
    const sanitizedQuery = sanitizeTextQuery(cleanedQuery);
    if (!sanitizedQuery) {
      console.log("Query was sanitized to empty string, skipping node search");
      return [];
    }
    
    console.log(`Searching nodes with cleaned query: "${cleanedQuery}" -> sanitized: "${sanitizedQuery}"`);
    
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
 * Process a knowledge base query using vector or text search
 */
export async function processQuery(options: QueryOptions): Promise<FormattedResult[]> {
  const { 
    query, 
    limit = 5, 
    useEmbeddings = true,
    matchThreshold = 0.3, // Lowered from 0.5 for better recall
    includeNodes = false
  } = options;
  
  console.log(`Processing query: "${query}" with threshold: ${matchThreshold}`);
  
  const supabase = createSupabaseClient();
  
  let chunkResults: FormattedResult[] = [];
  let nodeResults: FormattedResult[] = [];
  
  // Extract search terms from conversational query
  const extractedTerms = extractSearchTerms(query);
  console.log(`Extracted search terms: "${extractedTerms}"`);
  
  // Clean the extracted terms for better matching
  const cleanedQuery = cleanSearchQuery(extractedTerms || query);
  console.log(`Cleaned query: "${cleanedQuery}"`);
  
  if (!cleanedQuery) {
    console.log("Query was cleaned to empty string, trying original query");
    // If cleaning removed everything, use the original query
    const fallbackQuery = query.trim();
    if (!fallbackQuery) {
      return [];
    }
  }
  
  // Use the best available query
  const queryToUse = cleanedQuery || query;
  console.log(`Using query: "${queryToUse}"`);
  
  // Get results from knowledge chunks
  try {
    let chunksData: KnowledgeChunk[] = [];
    
    if (useEmbeddings) {
      try {
        // Get embeddings for the processed query
        const embedding = await generateQueryEmbedding(queryToUse);
        console.log(`Generated embedding for: "${queryToUse}"`);
    
        // Query using vector similarity search with lower threshold
        const { data: vectorResults, error: vectorError } = await supabase.rpc(
          'match_knowledge_chunks',
          {
            query_embedding: embedding,
            match_threshold: matchThreshold,
            match_count: limit
          }
        );
    
        if (vectorError) {
          console.error("Vector search error:", vectorError);
          throw vectorError;
        }
    
        chunksData = vectorResults || [];
        console.log(`Vector search found ${chunksData.length} results`);
        
        // If no results with processed query and it's different from original, try original
        if (chunksData.length === 0 && queryToUse !== query) {
          console.log(`No results with processed query, trying original: "${query}"`);
          
          const originalEmbedding = await generateQueryEmbedding(query);
          const { data: originalResults, error: originalError } = await supabase.rpc(
            'match_knowledge_chunks',
            {
              query_embedding: originalEmbedding,
              match_threshold: matchThreshold,
              match_count: limit
            }
          );
          
          if (!originalError && originalResults?.length > 0) {
            chunksData = originalResults;
            console.log(`Vector search with original query found ${chunksData.length} results`);
          }
        }
        
        // If still no results with vector search, fall back to text search
        if (chunksData.length === 0) {
          console.log(`No vector results found, falling back to text search for: "${queryToUse}"`);
          
          const sanitizedQuery = sanitizeTextQuery(queryToUse);
          
          if (!sanitizedQuery) {
            console.log("Query was sanitized to empty string, skipping text search");
          } else {
            console.log(`Using text search with sanitized query: "${sanitizedQuery}"`);
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
              console.log(`Text search found ${chunksData.length} results`);
            } catch (textSearchError) {
              console.error("Failed to perform text search:", textSearchError);
            }
          }
        }
      } catch (error) {
        console.error("Error in vector search:", error);
        
        // Fallback to text search on error
        const sanitizedQuery = sanitizeTextQuery(queryToUse);
        
        if (!sanitizedQuery) {
          console.log("Query was sanitized to empty string, skipping text search");
        } else {
          console.log(`Fallback to text search with: "${sanitizedQuery}"`);
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
            console.log(`Fallback text search found ${chunksData.length} results`);
          } catch (textSearchError) {
            console.error("Failed to perform text search as fallback:", textSearchError);
          }
        }
      }
    } else {
      // Direct text search if embeddings aren't used
      const sanitizedQuery = sanitizeTextQuery(queryToUse);
      
      if (!sanitizedQuery) {
        console.log("Query was sanitized to empty string, skipping text search");
      } else {
        console.log(`Direct text search with: "${sanitizedQuery}"`);
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
          console.log(`Direct text search found ${chunksData.length} results`);
        } catch (textSearchError) {
          console.error("Failed to perform text search:", textSearchError);
        }
      }
    }

    // Format results for consistency
    chunkResults = chunksData.map(chunk => {
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
        sourceType: 'knowledge',
        contentType: chunk.original_file_type || 'document',
        metadata: chunk.metadata || {}
      };
    });

  } catch (error) {
    console.error("Error processing knowledge chunks search:", error);
  }
  
  // Optionally get results from knowledge nodes
  if (includeNodes) {
    try {
      nodeResults = await searchKnowledgeNodes(supabase, queryToUse, limit);
      console.log(`Node search found ${nodeResults.length} results`);
    } catch (error) {
      console.error("Error processing knowledge nodes search:", error);
    }
  }
  
  // Combine results and sort by relevance
  const combinedResults = [...chunkResults, ...nodeResults]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit * 2);

  console.log(`Total combined results: ${combinedResults.length}`);
  return combinedResults;
}
