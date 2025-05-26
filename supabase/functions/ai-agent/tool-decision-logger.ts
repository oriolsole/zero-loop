
/**
 * Tool decision logging and reasoning utilities
 */

export interface ToolDecision {
  shouldUseTools: boolean;
  detectedType: 'search' | 'github' | 'knowledge' | 'general' | 'none';
  reasoning: string;
  suggestedTools: string[];
  confidence: number;
}

/**
 * Analyzes a message and determines what tools should be used
 */
export function analyzeToolRequirements(message: string): ToolDecision {
  const lowerMessage = message.toLowerCase();
  
  // GitHub detection patterns
  const githubPatterns = [
    /github\.com\/[\w-]+\/[\w-]+/i,
    /\b(github|repository|repo)\b/i,
    /\b(analyze|examine|look at|check|review).*(repository|repo|github)/i,
    /\b(code|source|files).*(github|repository)/i
  ];
  
  // Search detection patterns
  const searchPatterns = [
    /\b(search|find|look up|lookup)\b/i,
    /\b(information about|tell me about|what is|who is)\b/i,
    /\b(latest|current|recent|new).*(news|information|data)/i,
    /\b(how to|tutorial|guide|example)/i,
    /\b(knowledge base|my notes|my knowledge)/i
  ];
  
  // Knowledge base specific patterns
  const knowledgePatterns = [
    /\b(my knowledge|knowledge base|my notes|my documents)\b/i,
    /\b(search my|find in my|look in my)\b/i,
    /\b(remember|recall|stored|saved)\b/i
  ];
  
  // Check for GitHub requirements
  if (githubPatterns.some(pattern => pattern.test(message))) {
    return {
      shouldUseTools: true,
      detectedType: 'github',
      reasoning: 'GitHub repository reference detected - requires GitHub tools for repository analysis',
      suggestedTools: ['execute_github-tools'],
      confidence: 0.9
    };
  }
  
  // Check for knowledge base requirements
  if (knowledgePatterns.some(pattern => pattern.test(message))) {
    return {
      shouldUseTools: true,
      detectedType: 'knowledge',
      reasoning: 'Knowledge base query detected - requires knowledge search tools',
      suggestedTools: ['execute_knowledge-search-v2'],
      confidence: 0.85
    };
  }
  
  // Check for general search requirements
  if (searchPatterns.some(pattern => pattern.test(message))) {
    return {
      shouldUseTools: true,
      detectedType: 'search',
      reasoning: 'Search query detected - requires web search or knowledge search tools',
      suggestedTools: ['execute_web-search', 'execute_knowledge-search-v2'],
      confidence: 0.8
    };
  }
  
  // Check for questions that likely need current information
  const currentInfoPatterns = [
    /\b(latest|current|recent|today|now|2024|2025)\b/i,
    /\b(news|updates|developments|trends)\b/i,
    /\b(price|cost|rate|stock|market)\b/i
  ];
  
  if (currentInfoPatterns.some(pattern => pattern.test(message))) {
    return {
      shouldUseTools: true,
      detectedType: 'search',
      reasoning: 'Query about current information detected - requires web search for up-to-date data',
      suggestedTools: ['execute_web-search'],
      confidence: 0.75
    };
  }
  
  return {
    shouldUseTools: false,
    detectedType: 'general',
    reasoning: 'General conversation - no specific tools required',
    suggestedTools: [],
    confidence: 0.6
  };
}

/**
 * Logs tool decision reasoning
 */
export function logToolDecision(decision: ToolDecision, message: string): void {
  console.log('=== TOOL DECISION ANALYSIS ===');
  console.log('Message:', message);
  console.log('Should use tools:', decision.shouldUseTools);
  console.log('Detected type:', decision.detectedType);
  console.log('Reasoning:', decision.reasoning);
  console.log('Suggested tools:', decision.suggestedTools);
  console.log('Confidence:', decision.confidence);
  console.log('===============================');
}
