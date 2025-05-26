/**
 * Response handling utilities
 */

/**
 * Extracts assistant message from different AI model response formats
 */
export function extractAssistantMessage(data: any): { content: string; role: string; tool_calls?: any[] } | null {
  let assistantMessage;

  // Check for OpenAI-style response format
  if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
    assistantMessage = data.choices[0].message;
    console.log('Using OpenAI format - Assistant message tool calls:', assistantMessage.tool_calls?.length || 0);
    
    // Handle tool calls - if there are tool calls but no content, provide default content
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      if (!assistantMessage.content || assistantMessage.content.trim() === '') {
        assistantMessage.content = 'I\'ll help you with that request using the available tools.';
        console.log('Added default content for tool call response');
      }
    }
  }
  // Check for NPAW response format with 'result' field
  else if (data.result) {
    assistantMessage = {
      content: data.result,
      role: 'assistant'
    };
    console.log('Using NPAW format - Assistant message (no tool calls available)');
  }
  // Check for other direct response formats
  else if (data.content || data.message) {
    assistantMessage = {
      content: data.content || data.message,
      role: 'assistant'
    };
    console.log('Using direct format - Assistant message (no tool calls available)');
  }
  // Check if data itself is the message
  else if (typeof data === 'string') {
    assistantMessage = {
      content: data,
      role: 'assistant'
    };
    console.log('Using string format - Assistant message (no tool calls available)');
  }
  else {
    console.error('Unexpected response format:', data);
    return null;
  }

  // Ensure we have valid content - this is critical for tool call responses
  if (!assistantMessage || (!assistantMessage.content && !assistantMessage.tool_calls)) {
    console.error('No valid content or tool calls in assistant message:', assistantMessage);
    return null;
  }

  // Ensure content is a string, even if empty
  if (!assistantMessage.content) {
    assistantMessage.content = '';
  }

  // Enhanced code-block-wrapped output handling
  if (assistantMessage.content && typeof assistantMessage.content === 'string') {
    // Handle code blocks with optional language specifiers
    const codeBlockMatch = assistantMessage.content.match(/```(?:json|text|markdown)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      const cleanText = codeBlockMatch[1].trim();
      if (cleanText.length > 0) {
        assistantMessage.content = cleanText;
        console.log('Extracted content from code block wrapper');
      }
    }
    
    // Handle JSON wrapped responses
    if (assistantMessage.content.startsWith('{') && assistantMessage.content.endsWith('}')) {
      try {
        const parsed = JSON.parse(assistantMessage.content);
        if (parsed.content || parsed.response || parsed.answer) {
          assistantMessage.content = parsed.content || parsed.response || parsed.answer;
          console.log('Extracted content from JSON wrapper');
        }
      } catch (e) {
        // If JSON parsing fails, keep original content
        console.log('Failed to parse JSON-like content, keeping original');
      }
    }
  }

  return assistantMessage;
}

/**
 * Generates enhanced self-reflection summary
 */
export function generateSelfReflection(toolsUsed: any[], toolProgress: any[]): string {
  const successfulTools = toolsUsed.filter(t => t.success).length;
  const failedTools = toolsUsed.filter(t => !t.success).length;
  const totalExecutionTime = toolProgress.reduce((acc, tool) => {
    if (tool.startTime && tool.endTime) {
      const duration = new Date(tool.endTime).getTime() - new Date(tool.startTime).getTime();
      return acc + duration;
    }
    return acc;
  }, 0);
  
  let selfReflection = `Used ${toolsUsed.length} tool(s): ${successfulTools} succeeded, ${failedTools} failed. Total execution time: ${Math.round(totalExecutionTime / 1000 * 100) / 100}s`;
  
  if (failedTools > 0) {
    const failedToolNames = toolsUsed.filter(t => !t.success).map(t => t.name).join(', ');
    selfReflection += ` Failed tools: ${failedToolNames}`;
  }

  return selfReflection;
}
