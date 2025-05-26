
/**
 * Simplified tool decision analysis for UI and logging purposes only
 */

export interface SimpleToolDecision {
  shouldUseTools: boolean;
  detectedType: 'jira' | 'github' | 'search' | 'knowledge' | 'general';
  reasoning: string;
  confidence: number;
}

/**
 * Simple analysis for UI display and logging - does not force tool execution
 */
export function simpleAnalyzeToolRequirements(
  message: string, 
  conversationHistory: any[] = []
): SimpleToolDecision {
  
  const lowerMessage = message.toLowerCase().trim();
  
  // Simple pattern matching for UI display
  if (lowerMessage.includes('jira') || 
      /\b(retrieve|list|get|show)\s+(projects?|my\s+projects?)\b/.test(lowerMessage) ||
      lowerMessage.includes('create ticket') || 
      lowerMessage.includes('search issues')) {
    return {
      shouldUseTools: true,
      detectedType: 'jira',
      reasoning: 'Detected Jira-related request',
      confidence: 0.8
    };
  }
  
  if (lowerMessage.includes('github') || 
      lowerMessage.includes('repository') || 
      lowerMessage.includes('repo') ||
      /github\.com\/[\w-]+\/[\w-]+/.test(message)) {
    return {
      shouldUseTools: true,
      detectedType: 'github', 
      reasoning: 'Detected GitHub repository request',
      confidence: 0.8
    };
  }
  
  if (/\b(search|find|look\s+up)\b/.test(lowerMessage) && 
      !/\b(my|personal|knowledge|documents?|notes?)\b/.test(lowerMessage)) {
    return {
      shouldUseTools: true,
      detectedType: 'search',
      reasoning: 'Detected web search request',
      confidence: 0.7
    };
  }
  
  if (/\b(my|personal|knowledge|documents?|notes?|saved?|uploaded?)\b/.test(lowerMessage)) {
    return {
      shouldUseTools: true,
      detectedType: 'knowledge',
      reasoning: 'Detected knowledge base search request', 
      confidence: 0.7
    };
  }
  
  return {
    shouldUseTools: false,
    detectedType: 'general',
    reasoning: 'General conversation - no tools needed',
    confidence: 0.8
  };
}

/**
 * Simple logging function for debugging
 */
export function logSimpleToolDecision(decision: SimpleToolDecision, message: string) {
  console.log('=== SIMPLE TOOL ANALYSIS ===');
  console.log('Message:', message);
  console.log('Should use tools:', decision.shouldUseTools);
  console.log('Detected type:', decision.detectedType);
  console.log('Reasoning:', decision.reasoning);
  console.log('Confidence:', decision.confidence);
  console.log('===============================');
}
