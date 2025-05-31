
/**
 * Response extraction utilities with comprehensive validation and guaranteed non-null responses
 */

/**
 * Extract assistant message from AI model response with enhanced validation and fallbacks
 */
export function extractAssistantMessage(response: any): string {
  try {
    // Handle different response formats
    if (!response) {
      console.error('[EXTRACT_MESSAGE] No response provided to extractAssistantMessage');
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }

    // Check for direct message content (some APIs return this directly)
    if (typeof response === 'string') {
      const content = response.trim();
      return content || 'I apologize, but I received an empty response. Please try again.';
    }

    // Standard OpenAI format: response.choices[0].message.content
    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0];
      
      // Handle tool calls scenario
      if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
        // If there are tool calls, return any content or indicate tool usage
        const content = choice.message?.content;
        if (content && content.trim()) {
          return content.trim();
        }
        // If no content but tool calls exist, return a placeholder
        return 'Processing your request with available tools...';
      }
      
      // Standard message content
      if (choice.message?.content) {
        const content = choice.message.content.trim();
        return content || 'I apologize, but I received an empty response. Please try again.';
      }
    }

    // Handle direct content field
    if (response.content) {
      const content = String(response.content).trim();
      return content || 'I apologize, but I received an empty response. Please try again.';
    }

    // Handle message field directly
    if (response.message) {
      if (typeof response.message === 'string') {
        const content = response.message.trim();
        return content || 'I apologize, but I received an empty response. Please try again.';
      }
      if (response.message.content) {
        const content = String(response.message.content).trim();
        return content || 'I apologize, but I received an empty response. Please try again.';
      }
    }

    // Handle data field (some APIs wrap response in data)
    if (response.data) {
      return extractAssistantMessage(response.data);
    }

    // If we can't find content, log the response structure for debugging
    console.error('[EXTRACT_MESSAGE] Could not extract message from response structure:', {
      hasChoices: !!response.choices,
      choicesLength: response.choices?.length || 0,
      hasContent: !!response.content,
      hasMessage: !!response.message,
      hasData: !!response.data,
      responseKeys: Object.keys(response || {})
    });
    
    return 'I apologize, but I encountered an issue processing the AI response. Please try again.';
  } catch (error) {
    console.error('[EXTRACT_MESSAGE] Error in extractAssistantMessage:', error);
    return 'I apologize, but I encountered an error processing your request. Please try again.';
  }
}
