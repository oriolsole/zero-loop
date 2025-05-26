
/**
 * Search detection utilities
 */

/**
 * Detects if the message is a search request
 */
export function detectSearchRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('search') || 
         lowerMessage.includes('find') || 
         lowerMessage.includes('look up') ||
         lowerMessage.includes('information about') ||
         lowerMessage.includes('tell me about') ||
         lowerMessage.includes('knowledge base');
}
