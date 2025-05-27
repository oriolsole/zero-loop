
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
 * Enhanced search term extraction for multilingual content and company names
 */
function extractSearchTerms(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  let cleaned = query.toLowerCase().trim();
  
  // Preserve important company names and meeting terms (multilingual)
  const preserveTerms = [
    'npaw', 'adsmurai', 'meeting', 'discussed', 'reunión', 'discutido',
    'partnership', 'collaboration', 'strategy', 'estrategia', 'colaboración'
  ];
  
  // Extract preserved terms
  const preservedWords: string[] = [];
  for (const term of preserveTerms) {
    if (cleaned.includes(term)) {
      preservedWords.push(term);
    }
  }
  
  // Remove conversational prefixes (multilingual)
  const conversationalPrefixes = [
    'what was discussed in',
    'qué se discutió en',
    'what happened in',
    'qué pasó en',
    'tell me about',
    'cuéntame sobre',
    'háblame de',
    'search for',
    'buscar',
    'find',
    'encontrar',
    'look for',
    'buscar por'
  ];
  
  for (const prefix of conversationalPrefixes) {
    const pattern = new RegExp(`^${prefix}\\s+`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove question words and common suffixes
  cleaned = cleaned.replace(/^(what|qué|cuál|who|quién|when|cuándo|where|dónde|why|por qué)\s+/i, '');
  cleaned = cleaned.replace(/[?!.]+$/, '').trim();
  
  // Combine preserved terms with remaining meaningful words
  const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'our', 'can', 'you', 'el', 'la', 'los', 'las', 'en', 'de', 'con', 'por', 'para', 'y', 'o'];
  const remainingWords = cleaned.split(/\s+/).filter(word => 
    word.length > 2 && !stopWords.includes(word) && !preserveTerms.includes(word)
  );
  
  const finalTerms = [...preservedWords, ...remainingWords];
  return finalTerms.join(' ').trim();
}

/**
 * Enhanced query cleaning for better multilingual matching
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
    'what was discussed in',
    'qué se discutió en',
    'search for',
    'buscar',
    'find',
    'encontrar',
    'tell me about',
    'cuéntame sobre'
  ];
  
  for (const prefix of searchPrefixes) {
    const pattern = new RegExp(`^${prefix}\\s+`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned.trim();
}

/**
 * Enhanced text query sanitization for PostgreSQL with multilingual support
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
  
  // Remove special characters that might break tsquery
  let sanitized = cleanedQuery
    .replace(/['\\:&|!()]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
    
  if (sanitized === '') {
    return '';
  }
  
  // Split into words and filter stop words (multilingual)
  const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'el', 'la', 'los', 'las', 'en', 'de', 'con', 'por', 'para', 'y', 'o'];
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
 * Enhanced knowledge nodes search with better company name matching
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
 * Enhanced query processing with better multilingual support and company name recognition
 */
export async function processQuery(options: QueryOptions): Promise<FormattedResult[]> {
  const { 
    query, 
    limit = 5, 
    useEmbeddings = true,
    matchThreshold = 0.3, // Lower threshold for better recall
    includeNodes = false
  } = options;
  
  console.log(`Processing query: "${query}" with threshold: ${matchThreshold}`);
  
  const supabase = createSupabaseClient();
  
  let chunkResults: FormattedResult[] = [];
  let nodeResults: FormattedResult[] = [];
  
  // Extract search terms with enhanced multilingual support
  const extractedTerms = extractSearchTerms(query);
  console.log(`Extracted search terms: "${extractedTerms}"`);
  
  // Clean the extracted terms for better matching
  const cleanedQuery = cleanSearchQuery(extractedTerms || query);
  console.log(`Cleaned query: "${cleanedQuery}"`);
  
  // Use the best available query
  const queryToUse = cleanedQuery || extractedTerms || query;
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
            match_count: limit * 2 // Get more results to filter better
          }
        );
    
        if (vectorError) {
          console.error("Vector search error:", vectorError);
          throw vectorError;
        }
    
        chunksData = vectorResults || [];
        console.log(`Vector search found ${chunksData.length} results`);
        
        // If no results with processed query and it's different from original, try original
        if (chunksData.length === 0 && queryToUse !== query && query.trim()) {
          console.log(`No results with processed query, trying original: "${query}"`);
          
          const originalEmbedding = await generateQueryEmbedding(query);
          const { data: originalResults, error: originalError } = await supabase.rpc(
            'match_knowledge_chunks',
            {
              query_embedding: originalEmbedding,
              match_threshold: matchThreshold,
              match_count: limit * 2
            }
          );
          
          if (!originalError && originalResults?.length > 0) {
            chunksData = originalResults;
            console.log(`Found ${chunksData.length} results with original query`);
          }
        }
        
      } catch (error) {
        console.error("Error in vector search:", error);
        
        // Fallback to text search
        const sanitizedQuery = sanitizeTextQuery(queryToUse);
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
      const sanitizedQuery = sanitizeTextQuery(queryToUse);
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
    .slice(0, limit * 2); // Return more results for better context

  console.log(`Returning ${combinedResults.length} total results`);
  return combinedResults;
}
