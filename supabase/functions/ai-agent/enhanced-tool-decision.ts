
/**
 * Enhanced tool decision analysis with Lovable-style principles and context awareness
 */

export interface EnhancedToolDecision {
  shouldUseTools: boolean;
  detectedType: 'search' | 'github' | 'knowledge' | 'general' | 'none' | 'search-and-scrape' | 'scrape-content' | 'jira';
  reasoning: string;
  suggestedTools: string[];
  confidence: number;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedSteps: number;
  fallbackStrategy?: string;
  executionPlan: ExecutionStep[];
  contextualInfo?: {
    referencesGitHub?: boolean;
    githubRepo?: { owner: string; repo: string };
    referencePrevious?: boolean;
    needsDetailedContent?: boolean;
    hasUrls?: boolean;
  };
}

export interface ExecutionStep {
  step: number;
  tool: string;
  description: string;
  estimatedTime: number;
  dependencies?: string[];
}

/**
 * Enhanced analysis that incorporates conversation context and Lovable's systematic approach
 */
export function enhancedAnalyzeToolRequirements(
  message: string, 
  conversationHistory: any[] = []
): EnhancedToolDecision {
  const lowerMessage = message.toLowerCase();
  
  // Extract recent context from conversation history
  const contextInfo = analyzeConversationContext(message, conversationHistory);
  
  // Enhanced pattern recognition with context awareness
  const githubPatterns = [
    { pattern: /github\.com\/[\w-]+\/[\w-]+/i, weight: 1.0, context: 'direct_url' },
    { pattern: /\b(pull request|pr|merge|commit|branch|fork|clone)\b/i, weight: 0.9, context: 'git_workflow' },
    { pattern: /\b(analyze|examine|look at|check|review).*(repository|repo|github|code)\b/i, weight: 0.8, context: 'analysis_request' },
    { pattern: /\b(issue|releases?|contributors?|readme|documentation)\b/i, weight: 0.7, context: 'repo_content' },
    { pattern: /\b(file structure|directory structure|project structure|files|folders)\b/i, weight: 0.6, context: 'structure_query' }
  ];
  
  const searchPatterns = [
    { pattern: /\b(search|find|look up|lookup|google)\b/i, weight: 0.9, context: 'explicit_search' },
    { pattern: /\b(latest|current|recent|today|news)\b/i, weight: 0.8, context: 'current_info' },
    { pattern: /\b(what is|who is|how to|why does)\b/i, weight: 0.7, context: 'question' },
    { pattern: /\b(tutorial|guide|example|documentation)\b/i, weight: 0.6, context: 'learning' }
  ];
  
  const knowledgePatterns = [
    { pattern: /\b(my knowledge|knowledge base|my notes|remember)\b/i, weight: 1.0, context: 'personal_data' },
    { pattern: /\b(search my|find in my|look in my)\b/i, weight: 0.9, context: 'personal_search' },
    { pattern: /\b(previous|earlier|before|conversation|history)\b/i, weight: 0.8, context: 'conversation_history' },
    { pattern: /\b(stored|saved|documented|recorded)\b/i, weight: 0.7, context: 'stored_data' }
  ];

  // NEW: Jira-specific patterns
  const jiraPatterns = [
    { pattern: /\b(jira|atlassian)\b/i, weight: 1.0, context: 'jira_platform' },
    { pattern: /\b(connect to jira|jira api|jira integration|access jira)\b/i, weight: 0.9, context: 'jira_connection' },
    { pattern: /\b(search (in )?jira|find (in )?jira|retrieve.*jira)\b/i, weight: 0.9, context: 'jira_search' },
    { pattern: /\b(projects?|issues?|tickets?|epic|story|bug|sprint)\b/i, weight: 0.8, context: 'jira_entities' },
    { pattern: /\b(create (issue|ticket)|update (issue|ticket)|comment|assign)\b/i, weight: 0.7, context: 'jira_actions' },
    { pattern: /\b(jql|jira query)\b/i, weight: 0.8, context: 'jira_query' }
  ];

  // Web scraping specific patterns
  const scrapingPatterns = [
    { pattern: /https?:\/\/[^\s]+/g, weight: 1.0, context: 'direct_url' },
    { pattern: /\b(extract|scrape|get content|full article|detailed|comprehensive)\b/i, weight: 0.8, context: 'detailed_content' },
    { pattern: /\b(news today|current news|latest news|breaking news)\b/i, weight: 0.9, context: 'news_request' },
    { pattern: /\b(article|blog post|webpage|website content)\b/i, weight: 0.7, context: 'content_request' }
  ];

  // Context-aware reference patterns
  const contextReferencePatterns = [
    /\b(its?|this|that|the)\s+(file structure|directory structure|structure|files|folders)\b/i,
    /\b(what|how).*(its?|this|that)\b/i,
    /\b(structure|files|folders|contents?)\s+(of\s+)?(it|this|that)\b/i
  ];

  // Complexity assessment with multiple factors
  const complexityFactors = {
    simple: [
      /\b(what is|who is|simple|quick|brief)\b/i,
      /^.{1,50}$/
    ],
    moderate: [
      /\b(explain|describe|compare|how does)\b/i,
      /\band\b/i,
      /^.{51,150}$/
    ],
    complex: [
      /\b(comprehensive|detailed|in-depth|thorough|complete|analyze)\b/i,
      /\band\b.*\band\b/i,
      /^.{151,}$/
    ]
  };

  // Check if message references previous context
  const referencesContext = contextReferencePatterns.some(pattern => pattern.test(message));
  
  // Pattern matching with weighted scoring, enhanced by context
  let githubScore = 0;
  let searchScore = 0;
  let knowledgeScore = 0;
  let scrapingScore = 0;
  let jiraScore = 0;
  
  // Apply context boost for GitHub if we're referencing previous GitHub content
  const contextBoost = referencesContext && contextInfo.referencesGitHub ? 0.8 : 0;
  
  githubPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) githubScore += weight;
  });
  
  // Add context boost to GitHub score if appropriate
  if (contextBoost > 0) {
    githubScore += contextBoost;
  }
  
  searchPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) searchScore += weight;
  });
  
  knowledgePatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) knowledgeScore += weight;
  });

  scrapingPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) scrapingScore += weight;
  });

  // NEW: Calculate Jira score
  jiraPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) jiraScore += weight;
  });

  // Check for URLs in the message
  const hasUrls = /https?:\/\/[^\s]+/g.test(message);
  const needsDetailedContent = /\b(detailed|comprehensive|full|complete|in-depth|news today|current news|latest news)\b/i.test(message);

  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (complexityFactors.complex.some(pattern => pattern.test(message))) {
    complexity = 'complex';
  } else if (complexityFactors.moderate.some(pattern => pattern.test(message))) {
    complexity = 'moderate';
  }

  // Decision logic with context-aware confidence scoring
  let decision: EnhancedToolDecision;

  // NEW: Jira decision logic (check first since it's specific)
  if (jiraScore >= 0.6) {
    decision = {
      shouldUseTools: true,
      detectedType: 'jira',
      reasoning: `Jira-related request detected (score: ${jiraScore.toFixed(1)}) - requires Jira tools for project/issue management`,
      suggestedTools: ['execute_jira-tools'],
      confidence: Math.min(0.95, 0.7 + jiraScore * 0.2),
      complexity,
      estimatedSteps: complexity === 'complex' ? 3 : 2,
      fallbackStrategy: 'If Jira access fails, provide guidance on Jira setup and API configuration',
      contextualInfo: {
        referencePrevious: referencesContext
      },
      executionPlan: [
        {
          step: 1,
          tool: 'execute_jira-tools',
          description: 'Connect to Jira and execute the requested operation',
          estimatedTime: 8
        }
      ]
    };
  } else if (hasUrls && scrapingScore >= 0.7) {
    // Direct URL scraping request
    decision = {
      shouldUseTools: true,
      detectedType: 'scrape-content',
      reasoning: `Direct web scraping request detected - user provided specific URL(s) and wants detailed content extraction`,
      suggestedTools: ['execute_web-scraper'],
      confidence: 0.95,
      complexity,
      estimatedSteps: 2,
      fallbackStrategy: 'If scraping fails, try to provide information about the URL or suggest manual access',
      contextualInfo: {
        hasUrls: true,
        needsDetailedContent: true,
        referencePrevious: referencesContext
      },
      executionPlan: [
        {
          step: 1,
          tool: 'execute_web-scraper',
          description: 'Extract detailed content from the provided URL(s)',
          estimatedTime: 8
        }
      ]
    };
  } else if (needsDetailedContent && searchScore >= 0.7) {
    // Search + scrape scenario for comprehensive answers
    decision = {
      shouldUseTools: true,
      detectedType: 'search-and-scrape',
      reasoning: `Comprehensive information request detected - requires web search followed by content extraction for detailed answers`,
      suggestedTools: ['execute_web-search', 'execute_web-scraper'],
      confidence: 0.9,
      complexity: 'complex',
      estimatedSteps: 4,
      fallbackStrategy: 'If scraping fails, provide summary from search results; if search fails, use knowledge base',
      contextualInfo: {
        needsDetailedContent: true,
        referencePrevious: referencesContext
      },
      executionPlan: [
        {
          step: 1,
          tool: 'execute_web-search',
          description: 'Search for relevant sources and current information',
          estimatedTime: 6
        },
        {
          step: 2,
          tool: 'execute_web-scraper',
          description: 'Extract detailed content from top search results',
          estimatedTime: 10,
          dependencies: ['execute_web-search']
        }
      ]
    };
  } else if (githubScore >= 0.6 || (referencesContext && contextInfo.referencesGitHub)) {
    decision = {
      shouldUseTools: true,
      detectedType: 'github',
      reasoning: contextInfo.referencesGitHub 
        ? `Context-aware GitHub request detected (score: ${githubScore.toFixed(1)}) - references previous GitHub repository discussion`
        : `GitHub-related request detected (score: ${githubScore.toFixed(1)}) - requires repository analysis tools`,
      suggestedTools: ['execute_github-tools'],
      confidence: Math.min(0.95, 0.7 + githubScore * 0.2),
      complexity,
      estimatedSteps: complexity === 'complex' ? 4 : complexity === 'moderate' ? 3 : 2,
      fallbackStrategy: 'If GitHub access fails, provide general guidance about repository structure and best practices',
      contextualInfo: {
        referencesGitHub: contextInfo.referencesGitHub,
        githubRepo: contextInfo.githubRepo,
        referencePrevious: referencesContext
      },
      executionPlan: [
        {
          step: 1,
          tool: 'analyze_request',
          description: contextInfo.referencesGitHub 
            ? 'Use context from previous GitHub discussion'
            : 'Parse GitHub URL and determine required information',
          estimatedTime: 2
        },
        {
          step: 2,
          tool: 'execute_github-tools',
          description: 'Fetch repository data and analyze structure',
          estimatedTime: 8
        }
      ]
    };
  } else if (knowledgeScore >= 0.7) {
    decision = {
      shouldUseTools: true,
      detectedType: 'knowledge',
      reasoning: `Knowledge base query detected (confidence: ${knowledgeScore.toFixed(1)}) - searching personal documents and conversation history`,
      suggestedTools: ['execute_knowledge-search-v2'],
      confidence: Math.min(0.9, 0.6 + knowledgeScore * 0.25),
      complexity,
      estimatedSteps: complexity === 'complex' ? 3 : 2,
      fallbackStrategy: 'If no relevant knowledge found, suggest alternative search approaches or ask for clarification',
      contextualInfo: {
        referencePrevious: referencesContext
      },
      executionPlan: [
        {
          step: 1,
          tool: 'execute_knowledge-search-v2',
          description: 'Search through personal knowledge base and conversation history',
          estimatedTime: 5
        }
      ]
    };
  } else if (searchScore >= 0.5) {
    const needsMultipleTools = searchScore > 0.8 || complexity === 'complex';
    decision = {
      shouldUseTools: true,
      detectedType: 'search',
      reasoning: `Information search required (confidence: ${searchScore.toFixed(1)}) - need current or comprehensive information`,
      suggestedTools: needsMultipleTools ? 
        ['execute_web-search', 'execute_knowledge-search-v2'] : 
        ['execute_web-search'],
      confidence: Math.min(0.85, 0.5 + searchScore * 0.3),
      complexity,
      estimatedSteps: needsMultipleTools ? 3 : 2,
      fallbackStrategy: 'If web search fails, try knowledge base search or provide general guidance',
      contextualInfo: {
        referencePrevious: referencesContext
      },
      executionPlan: [
        {
          step: 1,
          tool: 'execute_web-search',
          description: 'Search the web for current information',
          estimatedTime: 6
        },
        ...(needsMultipleTools ? [{
          step: 2,
          tool: 'execute_knowledge-search-v2',
          description: 'Search knowledge base for additional context',
          estimatedTime: 4,
          dependencies: ['execute_web-search']
        }] : [])
      ]
    };
  } else {
    decision = {
      shouldUseTools: false,
      detectedType: 'general',
      reasoning: 'General conversation that can be handled with existing knowledge - no external tools required',
      suggestedTools: [],
      confidence: 0.8,
      complexity: 'simple',
      estimatedSteps: 1,
      contextualInfo: {
        referencePrevious: referencesContext
      },
      executionPlan: [
        {
          step: 1,
          tool: 'generate_response',
          description: 'Generate response using trained knowledge',
          estimatedTime: 3
        }
      ]
    };
  }

  return decision;
}

/**
 * Analyze conversation context to understand references to previous topics
 */
function analyzeConversationContext(currentMessage: string, conversationHistory: any[]): {
  referencesGitHub: boolean;
  githubRepo?: { owner: string; repo: string };
  referencePrevious: boolean;
} {
  const contextInfo = {
    referencesGitHub: false,
    githubRepo: undefined as { owner: string; repo: string } | undefined,
    referencePrevious: false
  };

  // Check if current message uses reference words
  const referenceWords = /\b(its?|this|that|the)\b/i;
  contextInfo.referencePrevious = referenceWords.test(currentMessage);

  // Look for GitHub context in recent conversation history (last 5 messages)
  const recentHistory = conversationHistory.slice(-5);
  
  for (const historyItem of recentHistory) {
    if (historyItem.content) {
      // Check for GitHub URLs
      const githubUrlMatch = historyItem.content.match(/github\.com\/([\w-]+)\/([\w-]+)/i);
      if (githubUrlMatch) {
        contextInfo.referencesGitHub = true;
        contextInfo.githubRepo = {
          owner: githubUrlMatch[1],
          repo: githubUrlMatch[2]
        };
        break;
      }
      
      // Check for GitHub-related discussion
      const githubKeywords = /\b(repository|repo|github|git)\b/i;
      if (githubKeywords.test(historyItem.content)) {
        contextInfo.referencesGitHub = true;
      }
    }
  }

  return contextInfo;
}

/**
 * Enhanced logging with structured output and context information
 */
export function logEnhancedToolDecision(decision: EnhancedToolDecision, message: string): void {
  console.log('=== ENHANCED TOOL DECISION ANALYSIS ===');
  console.log('Message:', message);
  console.log('Decision Summary:', {
    shouldUseTools: decision.shouldUseTools,
    detectedType: decision.detectedType,
    confidence: decision.confidence,
    complexity: decision.complexity,
    estimatedSteps: decision.estimatedSteps
  });
  console.log('Context Info:', decision.contextualInfo);
  console.log('Reasoning:', decision.reasoning);
  console.log('Suggested Tools:', decision.suggestedTools);
  console.log('Execution Plan:', decision.executionPlan);
  if (decision.fallbackStrategy) {
    console.log('Fallback Strategy:', decision.fallbackStrategy);
  }
  console.log('==========================================');
}
