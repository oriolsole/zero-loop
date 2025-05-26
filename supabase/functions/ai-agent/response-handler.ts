
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

  if (!assistantMessage || !assistantMessage.content) {
    return null;
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
