
/**
 * Knowledge Retrieval for Knowledge-First AI Responses
 */

/**
 * Retrieve relevant existing knowledge for a query with enhanced formatting
 */
export async function getRelevantKnowledge(
  message: string,
  userId: string | null,
  supabase: any
): Promise<any[] | null> {
  if (!userId) {
    console.log('No userId provided for knowledge retrieval');
    return null;
  }

  try {
    console.log('🔍 Retrieving relevant knowledge for query:', message);

    // Try semantic search via knowledge search function
    const semanticResults = await performSemanticSearch(message, userId, supabase);
    
    if (semanticResults?.length > 0) {
      console.log('📚 Found', semanticResults.length, 'semantic search results');
      
      // Convert to consistent format with enhanced metadata
      const knowledgeResults = semanticResults.map(result => ({
        id: result.id || crypto.randomUUID(),
        title: result.title || 'Knowledge Item',
        snippet: result.snippet || result.content?.substring(0, 300) + '...' || 'No description available',
        description: result.snippet || result.content?.substring(0, 200) + '...' || 'No description',
        type: result.sourceType === 'node' ? result.nodeType || 'insight' : 'chunk',
        confidence: result.relevanceScore || result.similarity || 0.8,
        relevanceScore: result.relevanceScore || result.similarity || 0.8,
        sourceType: result.sourceType || 'knowledge',
        nodeType: result.nodeType,
        source: result.source || 'Knowledge Base',
        metadata: {
          ...result.metadata,
          source: result.source,
          sourceType: result.sourceType,
          fileType: result.fileType,
          date: result.date,
          filePath: result.filePath,
          fileUrl: result.fileUrl
        }
      }));
      
      // Sort by relevance and return top results
      const sortedResults = knowledgeResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);
      
      console.log('✅ Returning', sortedResults.length, 'formatted knowledge results');
      return sortedResults;
    }

    // Fallback: Search knowledge nodes directly with better formatting
    const { data: relevantNodes, error: nodesError } = await supabase
      .from('knowledge_nodes')
      .select('id, title, description, type, confidence, metadata, created_at')
      .eq('user_id', userId)
      .gte('confidence', 0.5)
      .order('confidence', { ascending: false })
      .limit(10);

    if (nodesError) {
      console.error('❌ Error fetching knowledge nodes:', nodesError);
      return null;
    }

    if (relevantNodes && relevantNodes.length > 0) {
      const formattedNodes = relevantNodes.map(node => ({
        id: node.id,
        title: node.title,
        snippet: node.description,
        description: node.description,
        type: node.type,
        confidence: node.confidence,
        relevanceScore: node.confidence,
        sourceType: 'node',
        nodeType: node.type,
        source: 'Knowledge Nodes',
        metadata: {
          ...node.metadata,
          created_at: node.created_at
        }
      }));

      console.log('📝 Found', formattedNodes.length, 'relevant knowledge nodes');
      return formattedNodes.slice(0, 3);
    }

    console.log('ℹ️ No relevant knowledge found in database');
    return null;

  } catch (error) {
    console.error('❌ Error retrieving relevant knowledge:', error);
    return null;
  }
}

/**
 * Enhanced semantic search with better error handling
 */
async function performSemanticSearch(
  message: string,
  userId: string,
  supabase: any
): Promise<any[] | null> {
  try {
    console.log('🔍 Performing semantic search for:', message);
    
    // Call knowledge search function with enhanced parameters
    const { data: searchResults, error } = await supabase.functions.invoke('knowledge-search', {
      body: {
        query: message,
        limit: 8,
        matchThreshold: 0.25,
        includeNodes: true,
        useEmbeddings: true,
        userId: userId
      }
    });

    if (error) {
      console.error('❌ Error in semantic search:', error);
      return null;
    }

    if (!searchResults?.success) {
      console.error('❌ Semantic search failed:', searchResults?.error);
      return null;
    }

    const results = searchResults?.results || [];
    console.log('✅ Semantic search found', results.length, 'results');
    return results;
    
  } catch (error) {
    console.error('❌ Error performing semantic search:', error);
    return null;
  }
}

/**
 * Log when tools are used despite relevant knowledge being available (for debugging)
 */
export function logToolOveruse(query: string, knowledge: any[], toolsUsed: string[]): void {
  if (knowledge && knowledge.length > 0 && toolsUsed && toolsUsed.length > 0) {
    console.warn('⚠️ TOOL OVERUSE DETECTED:');
    console.warn('Query:', query);
    console.warn('Available knowledge:', knowledge.length, 'items');
    console.warn('Tools used anyway:', toolsUsed);
    console.warn('Consider improving prompt to prioritize knowledge base');
  }
}
