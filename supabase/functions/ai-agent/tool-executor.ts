
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

/**
 * Tool execution utilities
 */

export interface ToolProgress {
  id: string;
  name: string;
  displayName: string;
  status: 'starting' | 'executing' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  parameters: any;
  progress: number;
  result?: any;
  error?: string;
}

export interface ToolResult {
  name: string;
  parameters: any;
  result: any;
  success: boolean;
}

/**
 * Executes tools based on AI model tool calls
 */
export async function executeTools(
  toolCalls: any[],
  mcps: any[],
  userId: string,
  supabase: ReturnType<typeof createClient>,
  userAuthToken?: string // Add user auth token parameter
): Promise<{ toolResults: any[], toolsUsed: ToolResult[], toolProgress: ToolProgress[] }> {
  console.log('Processing', toolCalls.length, 'tool calls');
  const toolResults = [];
  const toolsUsed: ToolResult[] = [];
  const toolProgress: ToolProgress[] = [];
  
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
    
    // Enhanced tool progress tracking
    const toolProgressItem: ToolProgress = {
      id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: functionName,
      displayName: functionName.replace('execute_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      status: 'starting',
      startTime: new Date().toISOString(),
      parameters,
      progress: 0
    };
    toolProgress.push(toolProgressItem);
    
    // Extract MCP ID from function name
    const mcpKey = functionName.replace('execute_', '');
    const targetMcp = mcps?.find(m => m.default_key === mcpKey || m.id === mcpKey);
    
    if (!targetMcp) {
      console.error('Tool not found:', mcpKey, 'Available tools:', mcps?.map(m => m.default_key));
      const errorResult = { error: `Tool '${mcpKey}' not found or not available`, toolName: functionName };
      
      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        content: JSON.stringify(errorResult)
      });
      
      // Update progress with failure
      const progressIndex = toolProgress.findIndex(t => t.name === functionName);
      if (progressIndex !== -1) {
        toolProgress[progressIndex] = {
          ...toolProgress[progressIndex],
          status: 'failed',
          endTime: new Date().toISOString(),
          error: 'Tool not found'
        };
      }
      
      toolsUsed.push({
        name: functionName,
        parameters,
        result: errorResult,
        success: false
      });
      continue;
    }

    try {
      console.log('Using MCP endpoint:', targetMcp.endpoint, 'for tool:', targetMcp.title);
      
      // Update progress to executing
      const progressIndex = toolProgress.findIndex(t => t.name === functionName);
      if (progressIndex !== -1) {
        toolProgress[progressIndex] = {
          ...toolProgress[progressIndex],
          status: 'executing',
          progress: 25
        };
      }
      
      // Prepare parameters based on the tool type
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
        // For ALL other tools (including Google tools), add userId
        toolParameters.userId = userId;
      }
      
      console.log('Calling edge function:', targetMcp.endpoint, 'with parameters:', toolParameters);
      
      // Simulate progress updates during execution
      if (progressIndex !== -1) {
        toolProgress[progressIndex].progress = 50;
      }
      
      // All tools now use userId in body - no special Authorization header handling needed
      const invokeOptions: any = {
        body: toolParameters
      };
      
      console.log(`🔐 Calling ${targetMcp.endpoint} with userId in body`);
      
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(targetMcp.endpoint, invokeOptions);
      
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
      
      let mcpResult = edgeResult;
      
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
      
      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        content: JSON.stringify(processedResult)
      });

      // Update progress with completion
      if (progressIndex !== -1) {
        toolProgress[progressIndex] = {
          ...toolProgress[progressIndex],
          status: 'completed',
          endTime: new Date().toISOString(),
          progress: 100,
          result: processedResult
        };
      }

      toolsUsed.push({
        name: functionName,
        parameters,
        result: processedResult,
        success: true
      });

      console.log('Tool execution successful:', functionName);
      
    } catch (error) {
      console.error('Tool execution error:', functionName, error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      const errorResult = { 
        error: error.message,
        toolName: functionName,
        details: 'Check if required API tokens are configured and valid'
      };
      
      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        content: JSON.stringify(errorResult)
      });

      // Update progress with failure
      const progressIndex = toolProgress.findIndex(t => t.name === functionName);
      if (progressIndex !== -1) {
        toolProgress[progressIndex] = {
          ...toolProgress[progressIndex],
          status: 'failed',
          endTime: new Date().toISOString(),
          error: error.message
        };
      }

      toolsUsed.push({
        name: functionName,
        parameters,
        result: errorResult,
        success: false
      });
    }
  }
  
  return { toolResults, toolsUsed, toolProgress };
}
