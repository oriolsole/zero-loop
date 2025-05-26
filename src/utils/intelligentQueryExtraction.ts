
/**
 * Enhanced query extraction and parameter mapping for multi-tool AI agents
 */

export interface ToolParameters {
  [key: string]: any;
}

export interface ExtractedQuery {
  cleanedQuery: string;
  toolSpecificParams: Record<string, ToolParameters>;
  confidence: number;
  queryType: 'github' | 'search' | 'knowledge' | 'scrape' | 'general';
  entities: string[];
}

/**
 * Intelligently extracts and maps queries to appropriate tool parameters
 */
export function extractIntelligentQuery(originalQuery: string, conversationContext: any[] = []): ExtractedQuery {
  const cleaned = cleanQuery(originalQuery);
  const queryType = detectQueryType(cleaned, conversationContext);
  const entities = extractEntities(cleaned);
  
  return {
    cleanedQuery: cleaned,
    toolSpecificParams: generateToolParameters(cleaned, queryType, entities),
    confidence: calculateConfidence(cleaned, queryType),
    queryType,
    entities
  };
}

function cleanQuery(query: string): string {
  if (!query) return '';
  
  let cleaned = query.trim();
  
  // Remove conversational prefixes that interfere with tool execution
  const prefixes = [
    /^(can you|could you|please|help me to?)\s+/i,
    /^(search for|find|look for|get|fetch|retrieve)\s+/i,
    /^(what is|who is|how to|tell me about)\s+/i
  ];
  
  prefixes.forEach(prefix => {
    cleaned = cleaned.replace(prefix, '');
  });
  
  return cleaned.trim();
}

function detectQueryType(query: string, context: any[]): ExtractedQuery['queryType'] {
  const lowerQuery = query.toLowerCase();
  
  // GitHub detection with better patterns
  const githubPatterns = [
    /github\.com\/[\w-]+\/[\w-]+/i,
    /\b(commits?|pull requests?|issues?|branches?|repository|repo)\b/i,
    /\b(github|git)\s+(repo|repository|commits?|history)\b/i
  ];
  
  if (githubPatterns.some(pattern => pattern.test(query))) {
    return 'github';
  }
  
  // Check conversation context for GitHub references
  const hasGitHubContext = context.some(msg => 
    /github\.com\/[\w-]+\/[\w-]+/i.test(msg.content || '')
  );
  
  if (hasGitHubContext && /\b(recent|latest|new|commits?|changes?)\b/i.test(query)) {
    return 'github';
  }
  
  // Knowledge base detection
  if (/\b(my|our|previous|stored|saved|knowledge base)\b/i.test(query)) {
    return 'knowledge';
  }
  
  // Web scraping detection
  if (/https?:\/\/[^\s]+/g.test(query) || /\b(scrape|extract|content from)\b/i.test(query)) {
    return 'scrape';
  }
  
  // Search detection
  if (/\b(search|find|latest|current|news|information about)\b/i.test(query)) {
    return 'search';
  }
  
  return 'general';
}

function extractEntities(query: string): string[] {
  const entities: string[] = [];
  
  // Extract GitHub URLs
  const githubUrls = query.match(/github\.com\/([\w-]+)\/([\w-]+)/gi);
  if (githubUrls) {
    entities.push(...githubUrls);
  }
  
  // Extract URLs
  const urls = query.match(/https?:\/\/[^\s]+/g);
  if (urls) {
    entities.push(...urls);
  }
  
  // Extract quoted phrases
  const quoted = query.match(/"([^"]+)"/g);
  if (quoted) {
    entities.push(...quoted.map(q => q.replace(/"/g, '')));
  }
  
  return [...new Set(entities)];
}

function generateToolParameters(query: string, queryType: ExtractedQuery['queryType'], entities: string[]): Record<string, ToolParameters> {
  const params: Record<string, ToolParameters> = {};
  
  switch (queryType) {
    case 'github':
      params['execute_github-tools'] = generateGitHubParams(query, entities);
      break;
      
    case 'search':
      params['execute_web-search'] = {
        query: query,
        limit: 5
      };
      break;
      
    case 'knowledge':
      params['execute_knowledge-search-v2'] = {
        query: query,
        limit: 5,
        includeNodes: true
      };
      break;
      
    case 'scrape':
      const url = entities.find(e => e.startsWith('http'));
      if (url) {
        params['execute_web-scraper'] = {
          url,
          format: 'markdown',
          includeMetadata: true
        };
      }
      break;
  }
  
  return params;
}

function generateGitHubParams(query: string, entities: string[]): ToolParameters {
  const githubUrl = entities.find(e => e.includes('github.com'));
  
  if (githubUrl) {
    const match = githubUrl.match(/github\.com\/([\w-]+)\/([\w-]+)/i);
    if (match) {
      const [, owner, repo] = match;
      
      // Determine action based on query content
      if (/\b(commits?|history|recent changes?)\b/i.test(query)) {
        return {
          action: 'get_commits',
          owner,
          repository: repo,
          ref: 'main'
        };
      }
      
      if (/\b(files?|structure|contents?)\b/i.test(query)) {
        return {
          action: 'list_files',
          owner,
          repository: repo
        };
      }
      
      return {
        action: 'get_repository',
        owner,
        repository: repo
      };
    }
  }
  
  // Fallback for GitHub queries without explicit URLs
  return {
    action: 'search_repositories',
    query: query
  };
}

function calculateConfidence(query: string, queryType: ExtractedQuery['queryType']): number {
  const baseConfidence = 0.7;
  
  // Higher confidence for specific patterns
  if (queryType === 'github' && /github\.com\/[\w-]+\/[\w-]+/i.test(query)) {
    return 0.95;
  }
  
  if (queryType === 'scrape' && /https?:\/\/[^\s]+/g.test(query)) {
    return 0.9;
  }
  
  if (queryType === 'knowledge' && /\b(my|our|knowledge base)\b/i.test(query)) {
    return 0.85;
  }
  
  return baseConfidence;
}
