
/**
 * Tool result processing and formatting utilities
 */

export interface ToolResult {
  name: string;
  parameters: any;
  result: any;
  success: boolean;
}

/**
 * Process and format tool execution result
 */
export function processToolResult(
  toolCall: any,
  mcpResult: any,
  parameters: any
): { toolResult: any; toolUsed: ToolResult } {
  const functionName = toolCall.function.name;
  
  // Handle different response formats
  let processedResult = mcpResult;
  if (mcpResult && mcpResult.success === false) {
    throw new Error(mcpResult.error || 'Tool execution failed');
  }
  
  if (mcpResult && mcpResult.data) {
    processedResult = mcpResult.data;
  } else if (mcpResult && mcpResult.results) {
    processedResult = mcpResult.results;
  }
  
  const toolResult = {
    tool_call_id: toolCall.id,
    role: 'tool',
    content: JSON.stringify(processedResult)
  };

  const toolUsed: ToolResult = {
    name: functionName,
    parameters,
    result: processedResult,
    success: true
  };

  return { toolResult, toolUsed };
}

/**
 * Create error result for failed tool execution
 */
export function createErrorResult(
  toolCall: any,
  error: Error,
  parameters: any
): { toolResult: any; toolUsed: ToolResult } {
  const functionName = toolCall.function.name;
  
  const errorResult = { 
    error: error.message,
    toolName: functionName,
    details: 'Check if required API tokens are configured and valid'
  };
  
  const toolResult = {
    tool_call_id: toolCall.id,
    role: 'tool',
    content: JSON.stringify(errorResult)
  };

  const toolUsed: ToolResult = {
    name: functionName,
    parameters,
    result: errorResult,
    success: false
  };

  return { toolResult, toolUsed };
}

/**
 * Prepare tool parameters based on tool type
 */
export function prepareToolParameters(mcpKey: string, parameters: any, userId: string): any {
  let toolParameters = { ...parameters };
  
  // Special handling for knowledge-search-v2
  if (mcpKey === 'knowledge-search-v2') {
    // For knowledge proxy, send parameters directly
    toolParameters = {
      query: parameters.query || '',
      limit: parameters.limit || 5,
      includeNodes: parameters.includeNodes !== false,
      matchThreshold: parameters.matchThreshold || 0.5,
      useEmbeddings: parameters.useEmbeddings !== false
    };
  } else {
    // For other tools, add userId if available
    toolParameters.userId = userId;
  }
  
  return toolParameters;
}
