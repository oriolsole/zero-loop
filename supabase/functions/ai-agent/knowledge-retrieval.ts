
/**
 * Enhanced Knowledge Retrieval for Learning Loop Integration
 */

/**
 * Retrieve relevant existing knowledge for a query with enhanced company name matching
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

    // Enhanced key term extraction for company names and meeting terms
    const keyTerms = extractKeyTerms(message);
    console.log('Extracted key terms:', keyTerms);

    // First, try semantic search via knowledge search function
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
      
      return knowledgeResults.slice(0, 8); // Return more results for better context
    }

    // Fallback: Search knowledge nodes directly
    const { data: relevantNodes, error: nodesError } = await supabase
      .from('knowledge_nodes')
      .select('id, title, description, type, confidence, metadata')
      .eq('user_id', userId)
      .gte('confidence', 0.5) // Lower threshold for better recall
      .order('confidence', { ascending: false })
      .limit(15);

    if (nodesError) {
      console.error('Error fetching knowledge nodes:', nodesError);
      return null;
    }

    // Filter nodes by relevance to the current query
    const relevantKnowledge = relevantNodes?.filter(node => 
      isRelevantToQuery(node, message, keyTerms)
    ) || [];

    console.log('Found', relevantKnowledge.length, 'relevant knowledge items from nodes');
    return relevantKnowledge.slice(0, 5);

  } catch (error) {
    console.error('Error retrieving relevant knowledge:', error);
    return null;
  }
}

/**
 * Enhanced key term extraction with better company name recognition
 */
function extractKeyTerms(message: string): string[] {
  // Company names and meeting-specific terms that should be preserved
  const importantTerms = [
    'npaw', 'adsmurai', 'meeting', 'discussed', 'reunión', 'discutido',
    'partnership', 'collaboration', 'strategy', 'integration', 'project'
  ];
  
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'out', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
    'just', 'should', 'now', 'what', 'which', 'who', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'would',
    'could', 'may', 'might', 'must', 'shall'
  ]);

  // Extract all meaningful words
  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1)
    .filter(word => !stopWords.has(word) || importantTerms.includes(word));

  // Prioritize important terms
  const prioritizedTerms = words.filter(word => importantTerms.includes(word));
  const otherTerms = words.filter(word => !importantTerms.includes(word)).slice(0, 8);
  
  return [...prioritizedTerms, ...otherTerms];
}

/**
 * Enhanced relevance checking with better company name matching
 */
function isRelevantToQuery(node: any, message: string, keyTerms: string[]): boolean {
  const nodeText = `${node.title} ${node.description}`.toLowerCase();
  const messageText = message.toLowerCase();

  // High priority: direct company name matches
  const companyTerms = ['npaw', 'adsmurai'];
  const hasCompanyMatch = companyTerms.some(company => 
    nodeText.includes(company) || messageText.includes(company)
  );
  
  if (hasCompanyMatch && (nodeText.includes('meeting') || nodeText.includes('reunión'))) {
    return true; // High relevance for company + meeting combinations
  }

  // Direct text overlap
  const hasDirectMatch = keyTerms.some(term => nodeText.includes(term));
  
  // Check metadata tags
  const hasTagMatch = node.metadata?.tags?.some((tag: string) =>
    keyTerms.some(term => tag.toLowerCase().includes(term))
  );

  // Domain relevance
  const hasDomainMatch = node.metadata?.domain && 
    messageText.includes(node.metadata.domain.toLowerCase());

  return hasDirectMatch || hasTagMatch || hasDomainMatch || hasCompanyMatch;
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
    console.log('Performing semantic search for:', message);
    
    // Call knowledge search function with enhanced parameters
    const { data: searchResults, error } = await supabase.functions.invoke('knowledge-search', {
      body: {
        query: message,
        limit: 10,
        matchThreshold: 0.3, // Lower threshold for better recall
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

/**
 * Check if a query might benefit from a specific tool
 */
function shouldUseToolForQuery(messageText: string, toolName: string): boolean {
  const toolPatterns: Record<string, string[]> = {
    'web-search': ['search', 'find', 'latest', 'current', 'news', 'recent'],
    'github-tools': ['github', 'repository', 'repo', 'code', 'commit'],
    'knowledge-search': ['knowledge', 'notes', 'remember', 'saved', 'documents', 'meeting', 'discussed', 'npaw', 'adsmurai'],
    'jira-tools': ['jira', 'ticket', 'project', 'issue', 'task'],
    'web-scraper': ['scrape', 'extract', 'website', 'url', 'page']
  };

  const patterns = toolPatterns[toolName] || [];
  return patterns.some(pattern => messageText.includes(pattern));
}
