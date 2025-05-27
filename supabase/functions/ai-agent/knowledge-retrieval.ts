/**
 * Knowledge Retrieval for Knowledge-First AI Responses
 */

/**
 * Retrieve relevant existing knowledge for a query with enhanced formatting and tracking
 */
export async function getRelevantKnowledge(
  message: string,
  userId: string | null,
  supabase: any
): Promise<{ knowledge: any[] | null, trackingInfo: any | null }> {
  if (!userId) {
    console.log('No userId provided for knowledge retrieval');
    return { knowledge: null, trackingInfo: null };
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
      
      // Create tracking info for visibility
      const trackingInfo = {
        name: 'Knowledge Base Search',
        success: true,
        searchMode: 'semantic',
        sources: sortedResults,
        result: {
          query: message,
          totalResults: semanticResults.length,
          returnedResults: sortedResults.length,
          searchType: 'semantic_embedding',
          sources: sortedResults.map(result => ({
            id: result.id,
            title: result.title,
            snippet: result.snippet,
            relevanceScore: result.relevanceScore,
            sourceType: result.sourceType,
            metadata: result.metadata
          }))
        }
      };
      
      console.log('✅ Returning', sortedResults.length, 'formatted knowledge results with tracking');
      return { knowledge: sortedResults, trackingInfo };
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
      return { 
        knowledge: null, 
        trackingInfo: {
          name: 'Knowledge Base Search',
          success: false,
          error: nodesError.message,
          result: null
        }
      };
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

      const trackingInfo = {
        name: 'Knowledge Base Search',
        success: true,
        searchMode: 'direct_node_query',
        sources: formattedNodes.slice(0, 3),
        result: {
          query: message,
          totalResults: formattedNodes.length,
          returnedResults: Math.min(formattedNodes.length, 3),
          searchType: 'direct_node_query',
          sources: formattedNodes.slice(0, 3).map(node => ({
            id: node.id,
            title: node.title,
            snippet: node.snippet,
            confidence: node.confidence,
            type: node.type,
            metadata: node.metadata
          }))
        }
      };

      console.log('📝 Found', formattedNodes.length, 'relevant knowledge nodes with tracking');
      return { knowledge: formattedNodes.slice(0, 3), trackingInfo };
    }

    console.log('ℹ️ No relevant knowledge found in database');
    const trackingInfo = {
      name: 'Knowledge Base Search',
      success: true,
      searchMode: 'no_results',
      sources: [],
      result: {
        query: message,
        totalResults: 0,
        returnedResults: 0,
        searchType: 'comprehensive_search',
        message: 'No relevant knowledge found in database'
      }
    };

    return { knowledge: null, trackingInfo };

  } catch (error) {
    console.error('❌ Error retrieving relevant knowledge:', error);
    const trackingInfo = {
      name: 'Knowledge Base Search',
      success: false,
      error: error.message || 'Unknown error occurred',
      result: null
    };
    
    return { knowledge: null, trackingInfo };
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
