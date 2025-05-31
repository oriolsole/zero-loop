
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { 
  ToolProgress, 
  createToolProgress, 
  updateToolProgress, 
  completeToolProgress, 
  failToolProgress 
} from './tool-progress-tracker.ts';
import { 
  ToolResult, 
  processToolResult, 
  createErrorResult, 
  prepareToolParameters 
} from './tool-result-processor.ts';

/**
 * Main tool execution orchestrator
 */

export interface ToolProgressItem extends ToolProgress {}

/**
 * Executes tools based on AI model tool calls
 */
export async function executeTools(
  toolCalls: any[],
  mcps: any[],
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ toolResults: any[], toolsUsed: ToolResult[], toolProgress: ToolProgressItem[] }> {
  console.log('Processing', toolCalls.length, 'tool calls');
  const toolResults = [];
  const toolsUsed: ToolResult[] = [];
  let toolProgress: ToolProgressItem[] = [];
  
  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    let parameters;
    
    try {
      parameters = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Failed to parse tool parameters:', toolCall.function.arguments);
      parameters = {};
    }
    
    console.log('Executing tool:', functionName, 'with parameters:', parameters);
    
    // Create tool progress tracking
    const progressItem = createToolProgress(functionName, parameters);
    toolProgress.push(progressItem);
    
    // Extract MCP ID from function name
    const mcpKey = functionName.replace('execute_', '');
    const targetMcp = mcps?.find(m => m.default_key === mcpKey || m.id === mcpKey);
    
    if (!targetMcp) {
      console.error('Tool not found:', mcpKey, 'Available tools:', mcps?.map(m => m.default_key));
      const { toolResult, toolUsed } = createErrorResult(
        toolCall, 
        new Error(`Tool '${mcpKey}' not found or not available`), 
        parameters
      );
      
      toolResults.push(toolResult);
      toolsUsed.push(toolUsed);
      toolProgress = failToolProgress(toolProgress, functionName, 'Tool not found');
      continue;
    }

    try {
      console.log('Using MCP endpoint:', targetMcp.endpoint, 'for tool:', targetMcp.title);
      
      // Update progress to executing
      toolProgress = updateToolProgress(toolProgress, functionName, {
        status: 'executing',
        progress: 25
      });
      
      // Prepare parameters based on the tool type
      const toolParameters = prepareToolParameters(mcpKey, parameters, userId);
      
      console.log('Calling edge function:', targetMcp.endpoint, 'with parameters:', toolParameters);
      
      // Simulate progress updates during execution
      toolProgress = updateToolProgress(toolProgress, functionName, { progress: 50 });
      
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(targetMcp.endpoint, {
        body: toolParameters
      });
      
      console.log('Edge function response:', { 
        endpoint: targetMcp.endpoint,
        success: edgeResult?.success, 
        error: edgeError, 
        dataKeys: edgeResult ? Object.keys(edgeResult) : [],
        resultCount: edgeResult?.data?.length || edgeResult?.results?.length || 0
      });
      
      if (edgeError) {
        console.error('Edge function error:', edgeError);
        throw new Error(`Edge function error: ${edgeError.message}`);
      }
      
      const { toolResult, toolUsed } = processToolResult(toolCall, edgeResult, parameters);
      
      toolResults.push(toolResult);
      toolsUsed.push(toolUsed);
      toolProgress = completeToolProgress(toolProgress, functionName, toolUsed.result);

      console.log('Tool execution successful:', functionName);
      
    } catch (error) {
      console.error('Tool execution error:', functionName, error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      const { toolResult, toolUsed } = createErrorResult(toolCall, error, parameters);
      
      toolResults.push(toolResult);
      toolsUsed.push(toolUsed);
      toolProgress = failToolProgress(toolProgress, functionName, error.message);
    }
  }
  
  return { toolResults, toolsUsed, toolProgress };
}
