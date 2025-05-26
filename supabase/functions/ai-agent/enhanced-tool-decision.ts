
/**
 * Simplified tool decision analysis - removed complex logic
 * The AI model now handles all tool decisions naturally
 */

export interface SimpleToolDecision {
  shouldUseTools: boolean;
  detectedType: 'jira' | 'github' | 'search' | 'knowledge' | 'general';
  reasoning: string;
  confidence: number;
}

/**
 * Very simple analysis for logging purposes only
 */
export function simpleAnalyzeToolRequirements(
  message: string, 
  conversationHistory: any[] = []
): SimpleToolDecision {
  
  const lowerMessage = message.toLowerCase().trim();
  
  // Just provide basic categorization for logging
  if (lowerMessage.includes('jira')) {
    return {
      shouldUseTools: true,
      detectedType: 'jira',
      reasoning: 'Jira-related request detected',
      confidence: 0.8
    };
  }
  
  if (lowerMessage.includes('github') || lowerMessage.includes('repository')) {
    return {
      shouldUseTools: true,
      detectedType: 'github', 
      reasoning: 'GitHub-related request detected',
      confidence: 0.8
    };
  }
  
  if (/https?:\/\/[^\s]+/.test(message) || /\b(access|retrieve|scrape|get\s+content)\b/.test(lowerMessage)) {
    return {
      shouldUseTools: true,
      detectedType: 'search',
      reasoning: 'Web access or search request detected',
      confidence: 0.8
    };
  }
  
  if (/\b(search|find|look\s+up)\b/.test(lowerMessage)) {
    return {
      shouldUseTools: true,
      detectedType: 'search',
      reasoning: 'Search request detected',
      confidence: 0.7
    };
  }
  
  if (/\b(my|knowledge|documents?|notes?)\b/.test(lowerMessage)) {
    return {
      shouldUseTools: true,
      detectedType: 'knowledge',
      reasoning: 'Knowledge base request detected', 
      confidence: 0.7
    };
  }
  
  return {
    shouldUseTools: false,
    detectedType: 'general',
    reasoning: 'General conversation',
    confidence: 0.8
  };
}

/**
 * Simple logging function for debugging
 */
export function logSimpleToolDecision(decision: SimpleToolDecision, message: string) {
  console.log('=== SIMPLIFIED TOOL ANALYSIS ===');
  console.log('Message:', message);
  console.log('Detected type:', decision.detectedType);
  console.log('Reasoning:', decision.reasoning);
  console.log('===============================');
}
