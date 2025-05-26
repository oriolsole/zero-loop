
/**
 * Simplified tool decision analysis that trusts AI model intelligence
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
 * Simplified analysis that trusts the AI model to choose tools naturally
 */
export function enhancedAnalyzeToolRequirements(
  message: string, 
  conversationHistory: any[] = []
): EnhancedToolDecision {
  
  // Simple intent detection - does this need external tools?
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

  // If tools might be helpful, let the model decide
  return {
    shouldUseTools: true,
    detectedType: 'general', // Let model decide specific type
    reasoning: 'This request may benefit from external tools - the AI model will choose the most appropriate ones based on context',
    suggestedTools: [], // Don't pre-suggest, let model decide
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
 * Very basic check for whether external tools might be helpful
 */
function requiresExternalTools(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Clear indicators that external data might be needed
  const externalDataIndicators = [
    'search', 'find', 'look up', 'current', 'latest', 'recent', 'today',
    'github', 'repository', 'repo', 'jira', 'knowledge base', 'my notes',
    'what is', 'who is', 'how to', 'analyze', 'check', 'examine',
    'news', 'information about', 'details about'
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
 * Simple logging for debugging
 */
export function logEnhancedToolDecision(decision: EnhancedToolDecision, message: string): void {
  console.log('=== SIMPLIFIED TOOL DECISION ===');
  console.log('Message:', message);
  console.log('Should use tools:', decision.shouldUseTools);
  console.log('Reasoning:', decision.reasoning);
  console.log('Letting model choose tools naturally');
  console.log('================================');
}
