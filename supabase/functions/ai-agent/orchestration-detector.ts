
export interface OrchestrationContext {
  shouldUseOrchestration: boolean;
  suggestedTools: string[];
  dependencies: Record<string, string[]>;
  planType: 'comprehensive-search' | 'repo-analysis' | 'news-search' | 'single-tool';
}

export function detectOrchestrationNeeds(query: string): OrchestrationContext {
  const lowerQuery = query.toLowerCase().trim();
  
  // Don't use orchestration for basic greetings
  const basicQueries = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'how are you', 'what can you do', 'help', 'thanks', 'thank you'
  ];
  
  if (basicQueries.some(q => lowerQuery === q || lowerQuery.startsWith(q + ' '))) {
    return {
      shouldUseOrchestration: false,
      suggestedTools: [],
      dependencies: {},
      planType: 'single-tool'
    };
  }

  // Detect comprehensive research queries
  if (lowerQuery.includes('comprehensive') || lowerQuery.includes('detailed analysis') || 
      (lowerQuery.includes('search') && lowerQuery.includes('analyze'))) {
    return {
      shouldUseOrchestration: true,
      suggestedTools: ['google-search', 'knowledge-search'],
      dependencies: {},
      planType: 'comprehensive-search'
    };
  }

  // Detect GitHub repository analysis
  const githubMatch = lowerQuery.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)/i) || 
                     lowerQuery.match(/\b([\w-]+\/[\w-]+)\b/);
  if (githubMatch && (lowerQuery.includes('repo') || lowerQuery.includes('github') || lowerQuery.includes('analyze'))) {
    return {
      shouldUseOrchestration: true,
      suggestedTools: ['github-tools'],
      dependencies: {},
      planType: 'repo-analysis'
    };
  }

  // Detect search and scrape patterns
  if (lowerQuery.includes('search') && (lowerQuery.includes('scrape') || lowerQuery.includes('extract'))) {
    return {
      shouldUseOrchestration: true,
      suggestedTools: ['google-search', 'web-scraper'],
      dependencies: { 'web-scraper': ['google-search'] },
      planType: 'comprehensive-search'
    };
  }

  // Detect news aggregation requests
  if (lowerQuery.includes('latest news') || lowerQuery.includes('breaking news') || 
      (lowerQuery.includes('news') && (lowerQuery.includes('today') || lowerQuery.includes('recent')))) {
    return {
      shouldUseOrchestration: true,
      suggestedTools: ['google-search', 'knowledge-search'],
      dependencies: {},
      planType: 'news-search'
    };
  }

  // Check for multi-tool indicators
  const toolIndicators = [
    { pattern: /search.*knowledge|knowledge.*search/i, tools: ['google-search', 'knowledge-search'] },
    { pattern: /github.*search|search.*github/i, tools: ['github-tools', 'google-search'] },
    { pattern: /jira.*search|search.*jira/i, tools: ['jira-tools', 'google-search'] }
  ];

  for (const indicator of toolIndicators) {
    if (indicator.pattern.test(lowerQuery)) {
      return {
        shouldUseOrchestration: true,
        suggestedTools: indicator.tools,
        dependencies: {},
        planType: 'comprehensive-search'
      };
    }
  }

  // Single tool queries
  const singleToolPatterns = [
    { pattern: /github|repository|repo/i, tool: 'github-tools' },
    { pattern: /knowledge|documents|my files/i, tool: 'knowledge-search' },
    { pattern: /search|find|look up/i, tool: 'google-search' },
    { pattern: /jira|issues|tickets/i, tool: 'jira-tools' }
  ];

  for (const pattern of singleToolPatterns) {
    if (pattern.pattern.test(lowerQuery)) {
      return {
        shouldUseOrchestration: false,
        suggestedTools: [pattern.tool],
        dependencies: {},
        planType: 'single-tool'
      };
    }
  }

  return {
    shouldUseOrchestration: false,
    suggestedTools: [],
    dependencies: {},
    planType: 'single-tool'
  };
}
