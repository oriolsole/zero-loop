
/**
 * Knowledge Retrieval for Learning Loop Integration
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

    // Extract key terms from the message for matching
    const keyTerms = extractKeyTerms(message);
    console.log('Extracted key terms:', keyTerms);

    // Search knowledge nodes by title and description
    const { data: relevantNodes, error: nodesError } = await supabase
      .from('knowledge_nodes')
      .select('id, title, description, type, confidence, metadata')
      .eq('user_id', userId)
      .gte('confidence', 0.6) // Only high-confidence nodes
      .order('confidence', { ascending: false })
      .limit(10);

    if (nodesError) {
      console.error('Error fetching knowledge nodes:', nodesError);
      return null;
    }

    // Filter nodes by relevance to the current query
    const relevantKnowledge = relevantNodes?.filter(node => 
      isRelevantToQuery(node, message, keyTerms)
    ) || [];

    // Try semantic search via knowledge chunks if available
    if (relevantKnowledge.length < 3) {
      const semanticResults = await performSemanticSearch(message, userId, supabase);
      if (semanticResults?.length > 0) {
        // Convert chunks to knowledge format
        const additionalKnowledge = semanticResults.map(chunk => ({
          id: chunk.id,
          title: chunk.title,
          description: chunk.content?.substring(0, 200) + '...',
          type: 'chunk',
          confidence: chunk.similarity || 0.7,
          metadata: chunk.metadata
        }));

        relevantKnowledge.push(...additionalKnowledge);
      }
    }

    console.log('Found', relevantKnowledge.length, 'relevant knowledge items');
    return relevantKnowledge.slice(0, 5); // Return top 5 most relevant

  } catch (error) {
    console.error('Error retrieving relevant knowledge:', error);
    return null;
  }
}

/**
 * Extract key terms from a message for knowledge matching
 */
function extractKeyTerms(message: string): string[] {
  // Simple key term extraction
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
    'just', 'should', 'now', 'what', 'which', 'who', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall'
  ]);

  return message
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10); // Take first 10 meaningful terms
}

/**
 * Check if a knowledge node is relevant to the current query
 */
function isRelevantToQuery(node: any, message: string, keyTerms: string[]): boolean {
  const nodeText = `${node.title} ${node.description}`.toLowerCase();
  const messageText = message.toLowerCase();

  // Direct text overlap
  const hasDirectMatch = keyTerms.some(term => nodeText.includes(term));
  
  // Check metadata tags
  const hasTagMatch = node.metadata?.tags?.some((tag: string) =>
    keyTerms.some(term => tag.toLowerCase().includes(term))
  );

  // Domain relevance
  const hasDomainMatch = node.metadata?.domain && 
    messageText.includes(node.metadata.domain.toLowerCase());

  // Tool overlap (if query might use similar tools)
  const hasToolMatch = node.metadata?.tools_used?.some((tool: string) =>
    shouldUseToolForQuery(messageText, tool)
  );

  return hasDirectMatch || hasTagMatch || hasDomainMatch || hasToolMatch;
}

/**
 * Perform semantic search using knowledge chunks
 */
async function performSemanticSearch(
  message: string,
  userId: string,
  supabase: any
): Promise<any[] | null> {
  try {
    // Call knowledge search function with the query
    const { data: searchResults, error } = await supabase.functions.invoke('knowledge-search', {
      body: {
        query: message,
        limit: 3,
        matchThreshold: 0.7,
        userId: userId
      }
    });

    if (error) {
      console.error('Error in semantic search:', error);
      return null;
    }

    return searchResults?.results || null;
  } catch (error) {
    console.error('Error performing semantic search:', error);
    return null;
  }
}

/**
 * Check if a query might benefit from a specific tool
 */
function shouldUseToolForQuery(messageText: string, toolName: string): boolean {
  const toolPatterns: Record<string, string[]> = {
    'web-search': ['search', 'find', 'latest', 'current', 'news', 'recent'],
    'github-tools': ['github', 'repository', 'repo', 'code', 'commit'],
    'knowledge-search': ['knowledge', 'notes', 'remember', 'saved', 'documents'],
    'jira-tools': ['jira', 'ticket', 'project', 'issue', 'task'],
    'web-scraper': ['scrape', 'extract', 'website', 'url', 'page']
  };

  const patterns = toolPatterns[toolName] || [];
  return patterns.some(pattern => messageText.includes(pattern));
}
