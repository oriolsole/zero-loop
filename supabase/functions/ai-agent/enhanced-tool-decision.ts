
/**
 * Enhanced tool decision analysis with improved trigger phrase recognition
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
    jiraAction?: string;
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
 * Enhanced analysis with improved trigger phrase recognition
 */
export function enhancedAnalyzeToolRequirements(
  message: string, 
  conversationHistory: any[] = []
): EnhancedToolDecision {
  
  const lowerMessage = message.toLowerCase();
  
  // Enhanced Jira detection with specific trigger phrases
  const jiraDetection = detectJiraRequest(lowerMessage);
  if (jiraDetection.isJira) {
    return {
      shouldUseTools: true,
      detectedType: 'jira',
      reasoning: `Detected Jira request: ${jiraDetection.reasoning}`,
      suggestedTools: ['execute_jira-tools'],
      confidence: jiraDetection.confidence,
      complexity: 'simple',
      estimatedSteps: 1,
      contextualInfo: {
        jiraAction: jiraDetection.action
      },
      executionPlan: [
        {
          step: 1,
          tool: 'execute_jira-tools',
          description: `Execute Jira ${jiraDetection.action} action`,
          estimatedTime: 5
        }
      ]
    };
  }

  // Enhanced Knowledge Base detection
  const knowledgeDetection = detectKnowledgeRequest(lowerMessage);
  if (knowledgeDetection.isKnowledge) {
    return {
      shouldUseTools: true,
      detectedType: 'knowledge',
      reasoning: knowledgeDetection.reasoning,
      suggestedTools: ['execute_knowledge-search-v2'],
      confidence: knowledgeDetection.confidence,
      complexity: 'simple',
      estimatedSteps: 1,
      executionPlan: [
        {
          step: 1,
          tool: 'execute_knowledge-search-v2',
          description: 'Search personal knowledge base',
          estimatedTime: 4
        }
      ]
    };
  }

  // Enhanced GitHub detection
  const githubDetection = detectGitHubRequest(lowerMessage);
  if (githubDetection.isGithub) {
    return {
      shouldUseTools: true,
      detectedType: 'github',
      reasoning: githubDetection.reasoning,
      suggestedTools: ['execute_github-tools'],
      confidence: githubDetection.confidence,
      complexity: 'simple',
      estimatedSteps: 1,
      contextualInfo: {
        referencesGitHub: true,
        githubRepo: githubDetection.repo
      },
      executionPlan: [
        {
          step: 1,
          tool: 'execute_github-tools',
          description: `Execute GitHub ${githubDetection.action} action`,
          estimatedTime: 5
        }
      ]
    };
  }

  // Enhanced Web Search detection
  const webSearchDetection = detectWebSearchRequest(lowerMessage);
  if (webSearchDetection.isWebSearch) {
    return {
      shouldUseTools: true,
      detectedType: 'search',
      reasoning: webSearchDetection.reasoning,
      suggestedTools: ['execute_web-search'],
      confidence: webSearchDetection.confidence,
      complexity: 'simple',
      estimatedSteps: 1,
      executionPlan: [
        {
          step: 1,
          tool: 'execute_web-search',
          description: 'Search the web for current information',
          estimatedTime: 6
        }
      ]
    };
  }

  // If no specific tool is detected, determine if any tools might be helpful
  const needsExternalData = requiresExternalTools(message);
  
  if (!needsExternalData) {
    return {
      shouldUseTools: false,
      detectedType: 'general',
      reasoning: 'This appears to be a general question that can be answered with existing knowledge',
      suggestedTools: [],
      confidence: 0.8,
      complexity: 'simple',
      estimatedSteps: 1,
      contextualInfo: {},
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

  // Fallback for ambiguous requests
  return {
    shouldUseTools: true,
    detectedType: 'general',
    reasoning: 'This request may benefit from external tools - the AI model will choose the most appropriate ones based on context',
    suggestedTools: [],
    confidence: 0.7,
    complexity: determineComplexity(message),
    estimatedSteps: 2,
    fallbackStrategy: 'If no tools are used, provide response based on existing knowledge',
    contextualInfo: {
      referencePrevious: hasReferenceWords(message)
    },
    executionPlan: [
      {
        step: 1,
        tool: 'model_decision',
        description: 'Let the AI model choose appropriate tools based on the request',
        estimatedTime: 5
      }
    ]
  };
}

/**
 * Detect Jira-specific requests with enhanced trigger phrases
 */
function detectJiraRequest(message: string): { isJira: boolean; reasoning: string; confidence: number; action: string } {
  const jiraTriggers = {
    projects: ['retrieve projects', 'list projects', 'get projects', 'show projects', 'show my projects', 'what projects', 'my projects', 'project information'],
    issues: ['search issues', 'find tickets', 'jira issues', 'find bugs', 'show issues', 'list tickets'],
    create: ['create ticket', 'create issue', 'new task', 'file a bug', 'create bug', 'new issue'],
    specific: ['jira', 'ticket', 'issue key', 'project key']
  };

  // Check for project-related requests (highest confidence)
  for (const trigger of jiraTriggers.projects) {
    if (message.includes(trigger)) {
      return {
        isJira: true,
        reasoning: `Found project trigger phrase: "${trigger}"`,
        confidence: 0.95,
        action: 'list_projects'
      };
    }
  }

  // Check for issue-related requests
  for (const trigger of jiraTriggers.issues) {
    if (message.includes(trigger)) {
      return {
        isJira: true,
        reasoning: `Found issue trigger phrase: "${trigger}"`,
        confidence: 0.9,
        action: 'search_issues'
      };
    }
  }

  // Check for creation requests
  for (const trigger of jiraTriggers.create) {
    if (message.includes(trigger)) {
      return {
        isJira: true,
        reasoning: `Found creation trigger phrase: "${trigger}"`,
        confidence: 0.9,
        action: 'create_issue'
      };
    }
  }

  // Check for general Jira mentions
  for (const trigger of jiraTriggers.specific) {
    if (message.includes(trigger)) {
      return {
        isJira: true,
        reasoning: `Found Jira-specific term: "${trigger}"`,
        confidence: 0.8,
        action: 'list_projects'
      };
    }
  }

  return { isJira: false, reasoning: '', confidence: 0, action: '' };
}

/**
 * Detect knowledge base requests with enhanced trigger phrases
 */
function detectKnowledgeRequest(message: string): { isKnowledge: boolean; reasoning: string; confidence: number } {
  const knowledgeTriggers = [
    'search my knowledge', 'find in my documents', 'look in my notes',
    'search my files', 'my knowledge base', 'what did I save',
    'find my notes', 'search internal', 'from my uploads',
    'in my documents', 'my personal knowledge', 'search my content'
  ];

  for (const trigger of knowledgeTriggers) {
    if (message.includes(trigger)) {
      return {
        isKnowledge: true,
        reasoning: `Found knowledge base trigger phrase: "${trigger}"`,
        confidence: 0.95
      };
    }
  }

  return { isKnowledge: false, reasoning: '', confidence: 0 };
}

/**
 * Detect GitHub requests with enhanced trigger phrases
 */
function detectGitHubRequest(message: string): { isGithub: boolean; reasoning: string; confidence: number; action: string; repo?: { owner: string; repo: string } } {
  const githubTriggers = {
    repo: ['github repo', 'repository', 'repo details', 'github files', 'get repository', 'show me the repo'],
    commits: ['commits', 'commit history', 'latest commits', 'recent commits'],
    general: ['github', 'git']
  };

  // Check for GitHub URL
  const githubUrlMatch = message.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)/i);
  if (githubUrlMatch) {
    return {
      isGithub: true,
      reasoning: `Found GitHub URL: ${githubUrlMatch[0]}`,
      confidence: 0.95,
      action: 'get_repository',
      repo: { owner: githubUrlMatch[1], repo: githubUrlMatch[2] }
    };
  }

  // Check for repository triggers
  for (const trigger of githubTriggers.repo) {
    if (message.includes(trigger)) {
      return {
        isGithub: true,
        reasoning: `Found repository trigger phrase: "${trigger}"`,
        confidence: 0.9,
        action: 'get_repository'
      };
    }
  }

  // Check for commit triggers
  for (const trigger of githubTriggers.commits) {
    if (message.includes(trigger)) {
      return {
        isGithub: true,
        reasoning: `Found commit trigger phrase: "${trigger}"`,
        confidence: 0.9,
        action: 'get_commits'
      };
    }
  }

  return { isGithub: false, reasoning: '', confidence: 0, action: '' };
}

/**
 * Detect web search requests with enhanced trigger phrases
 */
function detectWebSearchRequest(message: string): { isWebSearch: boolean; reasoning: string; confidence: number } {
  const webSearchTriggers = [
    'search the web', 'find online', 'look up current', 'what\'s the latest',
    'search for', 'find information about', 'google', 'current news',
    'latest information', 'research', 'find articles', 'web search',
    'online search', 'internet search', 'look up'
  ];

  // Exclude internal searches
  const internalExclusions = ['my knowledge', 'my documents', 'my notes', 'my files', 'internal'];
  const hasInternalExclusion = internalExclusions.some(exclusion => message.includes(exclusion));

  if (hasInternalExclusion) {
    return { isWebSearch: false, reasoning: 'Contains internal search indicators', confidence: 0 };
  }

  for (const trigger of webSearchTriggers) {
    if (message.includes(trigger)) {
      return {
        isWebSearch: true,
        reasoning: `Found web search trigger phrase: "${trigger}"`,
        confidence: 0.9
      };
    }
  }

  return { isWebSearch: false, reasoning: '', confidence: 0 };
}

/**
 * Basic check for whether external tools might be helpful
 */
function requiresExternalTools(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Clear indicators that external data might be needed
  const externalDataIndicators = [
    'search', 'find', 'look up', 'current', 'latest', 'recent', 'today',
    'github', 'repository', 'repo', 'jira', 'knowledge base', 'my notes',
    'what is', 'who is', 'how to', 'analyze', 'check', 'examine',
    'news', 'information about', 'details about', 'projects'
  ];
  
  // Simple conversational responses that clearly don't need tools
  const conversationalPatterns = [
    'hello', 'hi', 'hey', 'thanks', 'thank you', 'good morning',
    'good afternoon', 'good evening', 'how are you', 'what can you do',
    'help me', 'explain', 'tell me about programming', 'how does'
  ];
  
  // Check if it's clearly conversational first
  if (conversationalPatterns.some(pattern => lowerMessage.includes(pattern) && lowerMessage.length < 100)) {
    return false;
  }
  
  // Check if it might benefit from external data
  return externalDataIndicators.some(indicator => lowerMessage.includes(indicator));
}

/**
 * Determine complexity based on message length and content
 */
function determineComplexity(message: string): 'simple' | 'moderate' | 'complex' {
  if (message.length > 200 || message.includes(' and ') && message.includes(' also ')) {
    return 'complex';
  } else if (message.length > 50) {
    return 'moderate';
  }
  return 'simple';
}

/**
 * Check for reference words that might indicate context dependency
 */
function hasReferenceWords(message: string): boolean {
  const referenceWords = /\b(its?|this|that|the|previous|earlier|before)\b/i;
  return referenceWords.test(message);
}

/**
 * Enhanced logging for debugging tool decisions
 */
export function logEnhancedToolDecision(decision: EnhancedToolDecision, message: string): void {
  console.log('=== ENHANCED TOOL DECISION ===');
  console.log('Message:', message);
  console.log('Should use tools:', decision.shouldUseTools);
  console.log('Detected type:', decision.detectedType);
  console.log('Reasoning:', decision.reasoning);
  console.log('Suggested tools:', decision.suggestedTools);
  console.log('Confidence:', decision.confidence);
  if (decision.contextualInfo?.jiraAction) {
    console.log('Jira action:', decision.contextualInfo.jiraAction);
  }
  console.log('===============================');
}
