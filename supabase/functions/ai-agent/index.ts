import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], userId, sessionId, streaming = false, modelSettings } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('AI Agent request:', { 
      message, 
      historyLength: conversationHistory.length, 
      userId, 
      sessionId,
      streaming,
      modelSettings
    });

    // Store conversation in database if userId and sessionId provided
    if (userId && sessionId) {
      await supabase.from('agent_conversations').insert({
        user_id: userId,
        session_id: sessionId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
      });
    }

    // Fetch available MCPs from the database - only include working ones
    const { data: mcps, error: mcpError } = await supabase
      .from('mcps')
      .select('*')
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search-v2']); // Only include working tools

    if (mcpError) {
      console.error('Error fetching MCPs:', mcpError);
      throw new Error('Failed to fetch available tools');
    }

    console.log('Available MCPs:', mcps?.map(m => ({ title: m.title, endpoint: m.endpoint, key: m.default_key })));

    // Convert MCPs to OpenAI function definitions
    const tools = mcps?.map(mcp => {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      let parameters;
      try {
        parameters = typeof mcp.parameters === 'string' 
          ? JSON.parse(mcp.parameters) 
          : mcp.parameters || [];
      } catch (e) {
        console.warn('Failed to parse parameters for MCP:', mcp.id);
        parameters = [];
      }

      parameters.forEach((param: any) => {
        properties[param.name] = {
          type: param.type === 'number' ? 'number' : 'string',
          description: param.description || `${param.name} parameter`
        };

        if (param.enum && Array.isArray(param.enum)) {
          properties[param.name].enum = param.enum;
        }

        if (param.required) {
          required.push(param.name);
        }
      });

      return {
        type: 'function',
        function: {
          name: `execute_${mcp.default_key || mcp.id}`,
          description: mcp.description,
          parameters: {
            type: 'object',
            properties,
            required
          }
        }
      };
    }) || [];

    console.log('Generated tools:', tools.map(t => t.function.name));

    // Enhanced system prompt with self-reflection capabilities
    const systemPrompt = `You are an advanced AI agent with access to various tools and self-reflection capabilities. You can help users by:

1. **Tool Usage**: Search the web, access knowledge bases, and use specialized tools
2. **Self-Reflection**: After using tools, analyze the results and determine if they meet the user's needs
3. **Task Planning**: Break down complex requests into manageable steps
4. **Error Recovery**: If a tool fails, try alternative approaches or explain limitations

**Available tools**: ${mcps?.map(m => `${m.title} - ${m.description}`).join(', ')}

**Tool Execution Guidelines**:
- Always use tools when you can provide better information through them
- For GitHub queries, use the github-tools with appropriate action (get_repository, get_file_content, list_files, etc.)
- For current information, use web-search
- For knowledge base queries, use knowledge-search-v2
- Be specific with tool parameters to get the best results

**Self-Reflection Protocol**:
- After using tools, assess if the results answer the user's question
- If results are incomplete, suggest follow-up actions
- If tools fail, explain what went wrong and offer alternatives
- Always explain your reasoning when choosing tools

**Communication Style**:
- Be conversational and helpful
- Explain what you're doing when using tools
- Provide context for your decisions
- Ask clarifying questions when needed

Remember: You can use multiple tools in sequence and should reflect on their outputs to provide the best possible assistance.`;

    // Prepare messages for AI model
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    // Use the ai-model-proxy instead of calling OpenAI directly
    const modelRequestBody = {
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2000,
      stream: streaming,
      // Pass model settings if provided
      ...(modelSettings && {
        provider: modelSettings.provider,
        model: modelSettings.selectedModel,
        localModelUrl: modelSettings.localModelUrl
      })
    };

    console.log('Calling AI model proxy with tools:', tools.length);

    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: modelRequestBody
    });

    if (response.error) {
      console.error('AI Model Proxy error:', response.error);
      throw new Error(`AI Model Proxy error: ${response.error.message}`);
    }

    const data = response.data;
    console.log('AI Model response received, checking for tool calls...');

    if (streaming) {
      // Handle streaming response
      return new Response(JSON.stringify(data), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Defensive null checking and different response format handling
    let assistantMessage;
    let fallbackUsed = data.fallback_used || false;
    let fallbackReason = data.fallback_reason || '';

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
      throw new Error('Invalid response format from AI model');
    }

    if (!assistantMessage || !assistantMessage.content) {
      throw new Error('No valid message content received from AI model');
    }

    let finalResponse = assistantMessage.content;
    let toolsUsed: any[] = [];
    let selfReflection = '';
    let toolProgress: any[] = [];

    // Enhanced tool execution with detailed progress tracking
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log('Processing', assistantMessage.tool_calls.length, 'tool calls');
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
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
        const toolProgressItem = {
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
          
          // Add userId to parameters for tools that need it
          const toolParameters = {
            ...parameters,
            userId: userId
          };
          
          console.log('Calling edge function:', targetMcp.endpoint, 'with parameters:', toolParameters);
          
          // Simulate progress updates during execution
          if (progressIndex !== -1) {
            toolProgress[progressIndex].progress = 50;
          }
          
          const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(targetMcp.endpoint, {
            body: toolParameters
          });
          
          console.log('Edge function response:', { success: edgeResult?.success, error: edgeError, dataKeys: edgeResult ? Object.keys(edgeResult) : [] });
          
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
      
      console.log('Tool execution summary:', {
        total: toolsUsed.length,
        successful: toolsUsed.filter(t => t.success).length,
        failed: toolsUsed.filter(t => !t.success).length
      });
      
      // Make another AI call with the tool results and self-reflection
      const followUpMessages = [
        ...messages,
        assistantMessage,
        ...toolResults,
        {
          role: 'system',
          content: `Now reflect on the tool results. Assess:
1. Did the tools provide useful information for the user's request?
2. Are there any gaps or issues with the results?
3. Should you recommend additional actions or tools?
4. If tools failed, explain what went wrong and suggest alternatives
5. Provide a clear, helpful response based on all available information.

Be transparent about any limitations or failures. If GitHub tools failed, mention that the user should check their GitHub token configuration.`
        }
      ];
      
      const followUpRequestBody = {
        messages: followUpMessages,
        temperature: 0.7,
        max_tokens: 2000,
        // Pass model settings if provided
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel,
          localModelUrl: modelSettings.localModelUrl
        })
      };

      console.log('Making follow-up call with tool results');

      const followUpResponse = await supabase.functions.invoke('ai-model-proxy', {
        body: followUpRequestBody
      });
      
      if (followUpResponse.error) {
        throw new Error(`AI Model Proxy follow-up error: ${followUpResponse.error.message}`);
      }
      
      const followUpData = followUpResponse.data;
      
      // Handle follow-up response with same defensive checking
      if (followUpData.choices && Array.isArray(followUpData.choices) && followUpData.choices.length > 0) {
        finalResponse = followUpData.choices[0].message.content;
      } else if (followUpData.result) {
        finalResponse = followUpData.result;
      } else if (followUpData.content || followUpData.message) {
        finalResponse = followUpData.content || followUpData.message;
      } else if (typeof followUpData === 'string') {
        finalResponse = followUpData;
      } else {
        console.error('Unexpected follow-up response format:', followUpData);
        finalResponse = assistantMessage.content; // Fall back to original response
      }
      
      // Check if fallback was used in follow-up
      if (followUpData.fallback_used) {
        fallbackUsed = true;
        fallbackReason = followUpData.fallback_reason;
      }
      
      // Generate enhanced self-reflection summary
      const successfulTools = toolsUsed.filter(t => t.success).length;
      const failedTools = toolsUsed.filter(t => !t.success).length;
      const totalExecutionTime = toolProgress.reduce((acc, tool) => {
        if (tool.startTime && tool.endTime) {
          const duration = new Date(tool.endTime).getTime() - new Date(tool.startTime).getTime();
          return acc + duration;
        }
        return acc;
      }, 0);
      
      selfReflection = `Used ${toolsUsed.length} tool(s): ${successfulTools} succeeded, ${failedTools} failed. Total execution time: ${Math.round(totalExecutionTime / 1000 * 100) / 100}s`;
      
      if (failedTools > 0) {
        const failedToolNames = toolsUsed.filter(t => !t.success).map(t => t.name).join(', ');
        selfReflection += ` Failed tools: ${failedToolNames}`;
      }

      console.log('Follow-up response completed successfully');
    } else {
      console.log('No tool calls were made by the AI model');
    }

    // Store assistant response in database
    if (userId && sessionId) {
      await supabase.from('agent_conversations').insert({
        user_id: userId,
        session_id: sessionId,
        role: 'assistant',
        content: finalResponse,
        tools_used: toolsUsed,
        self_reflection: selfReflection,
        created_at: new Date().toISOString()
      });
    }

    console.log('Returning response with', toolsUsed.length, 'tools used');

    return new Response(
      JSON.stringify({
        success: true,
        message: finalResponse,
        toolsUsed: toolsUsed.map(t => ({
          name: t.name,
          parameters: t.parameters,
          success: t.success,
          result: t.result
        })),
        toolProgress, // Enhanced tool progress information
        selfReflection,
        sessionId,
        fallbackUsed,
        fallbackReason
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Agent error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
