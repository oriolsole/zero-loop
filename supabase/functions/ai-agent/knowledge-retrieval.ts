
/**
 * Simplified Knowledge Retrieval for Learning Loop Integration
 */

/**
 * Retrieve relevant existing knowledge for a query
 */
export async function getRelevantKnowledge(
  message: string,
  userId: string | null,
  supabase: any
): Promise<any[] | null> {
  if (!userId) {
    return null;
  }

  try {
    console.log('Retrieving relevant knowledge for query:', message);

    // Try semantic search via knowledge search function
    const semanticResults = await performSemanticSearch(message, userId, supabase);
    
    if (semanticResults?.length > 0) {
      console.log('Found', semanticResults.length, 'semantic search results');
      
      // Convert to consistent format
      const knowledgeResults = semanticResults.map(result => ({
        id: result.id || crypto.randomUUID(),
        title: result.title || 'Knowledge Item',
        description: result.snippet || result.content?.substring(0, 200) + '...' || 'No description',
        type: result.sourceType === 'node' ? result.nodeType || 'insight' : 'chunk',
        confidence: result.relevanceScore || result.similarity || 0.8,
        metadata: {
          ...result.metadata,
          source: result.source,
          sourceType: result.sourceType,
          fileType: result.fileType,
          date: result.date
        }
      }));
      
      return knowledgeResults.slice(0, 8);
    }

    // Fallback: Search knowledge nodes directly
    const { data: relevantNodes, error: nodesError } = await supabase
      .from('knowledge_nodes')
      .select('id, title, description, type, confidence, metadata')
      .eq('user_id', userId)
      .gte('confidence', 0.5)
      .order('confidence', { ascending: false })
      .limit(15);

    if (nodesError) {
      console.error('Error fetching knowledge nodes:', nodesError);
      return null;
    }

    console.log('Found', relevantNodes?.length || 0, 'relevant knowledge items from nodes');
    return relevantNodes?.slice(0, 5) || [];

  } catch (error) {
    console.error('Error retrieving relevant knowledge:', error);
    return null;
  }
}

/**
 * Simplified semantic search with generic approach
 */
async function performSemanticSearch(
  message: string,
  userId: string,
  supabase: any
): Promise<any[] | null> {
  try {
    console.log('Performing semantic search for:', message);
    
    // Call knowledge search function - let it handle the query processing
    const { data: searchResults, error } = await supabase.functions.invoke('knowledge-search', {
      body: {
        query: message,
        limit: 10,
        matchThreshold: 0.3,
        includeNodes: true,
        useEmbeddings: true,
        userId: userId
      }
    });

    if (error) {
      console.error('Error in semantic search:', error);
      return null;
    }

    if (!searchResults?.success) {
      console.error('Semantic search failed:', searchResults?.error);
      return null;
    }

    console.log('Semantic search found', searchResults.results?.length || 0, 'results');
    return searchResults?.results || null;
    
  } catch (error) {
    console.error('Error performing semantic search:', error);
    return null;
  }
}
