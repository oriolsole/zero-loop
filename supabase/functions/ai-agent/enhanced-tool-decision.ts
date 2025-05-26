
/**
 * Enhanced tool decision analysis with Lovable-style principles
 */

export interface EnhancedToolDecision {
  shouldUseTools: boolean;
  detectedType: 'search' | 'github' | 'knowledge' | 'general' | 'none';
  reasoning: string;
  suggestedTools: string[];
  confidence: number;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedSteps: number;
  fallbackStrategy?: string;
  executionPlan: ExecutionStep[];
}

export interface ExecutionStep {
  step: number;
  tool: string;
  description: string;
  estimatedTime: number;
  dependencies?: string[];
}

/**
 * Enhanced analysis that incorporates Lovable's systematic approach
 */
export function enhancedAnalyzeToolRequirements(message: string): EnhancedToolDecision {
  const lowerMessage = message.toLowerCase();
  
  // Enhanced pattern recognition with context awareness
  const githubPatterns = [
    { pattern: /github\.com\/[\w-]+\/[\w-]+/i, weight: 1.0, context: 'direct_url' },
    { pattern: /\b(pull request|pr|merge|commit|branch|fork|clone)\b/i, weight: 0.9, context: 'git_workflow' },
    { pattern: /\b(analyze|examine|look at|check|review).*(repository|repo|github|code)/i, weight: 0.8, context: 'analysis_request' },
    { pattern: /\b(issue|releases?|contributors?|readme|documentation)\b/i, weight: 0.7, context: 'repo_content' }
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

  // Pattern matching with weighted scoring
  let githubScore = 0;
  let searchScore = 0;
  let knowledgeScore = 0;
  
  githubPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) githubScore += weight;
  });
  
  searchPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) searchScore += weight;
  });
  
  knowledgePatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) knowledgeScore += weight;
  });

  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (complexityFactors.complex.some(pattern => pattern.test(message))) {
    complexity = 'complex';
  } else if (complexityFactors.moderate.some(pattern => pattern.test(message))) {
    complexity = 'moderate';
  }

  // Decision logic with confidence scoring
  let decision: EnhancedToolDecision;

  if (githubScore >= 0.7) {
    decision = {
      shouldUseTools: true,
      detectedType: 'github',
      reasoning: `GitHub-related request detected (confidence: ${githubScore.toFixed(1)}) - requires repository analysis tools`,
      suggestedTools: ['execute_github-tools'],
      confidence: Math.min(0.95, 0.7 + githubScore * 0.2),
      complexity,
      estimatedSteps: complexity === 'complex' ? 4 : complexity === 'moderate' ? 3 : 2,
      fallbackStrategy: 'If GitHub access fails, provide general guidance about repository structure and best practices',
      executionPlan: [
        {
          step: 1,
          tool: 'analyze_request',
          description: 'Parse GitHub URL and determine required information',
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
      executionPlan: [
        {
          step: 1,
          tool: 'execute_knowledge-search-v2',
          description: 'Search through personal knowledge base and conversation history',
          estimatedTime: 5
        }
      ]
    };
  } else if (searchScore >= 0.6) {
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
      fallbackStrategy: 'If web search fails, try knowledge base search or provide general information',
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
 * Enhanced logging with structured output
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
  console.log('Reasoning:', decision.reasoning);
  console.log('Suggested Tools:', decision.suggestedTools);
  console.log('Execution Plan:', decision.executionPlan);
  if (decision.fallbackStrategy) {
    console.log('Fallback Strategy:', decision.fallbackStrategy);
  }
  console.log('==========================================');
}
