
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

    // Fetch available MCPs from the database
    const { data: mcps, error: mcpError } = await supabase
      .from('mcps')
      .select('*')
      .eq('isDefault', true);

    if (mcpError) {
      console.error('Error fetching MCPs:', mcpError);
      throw new Error('Failed to fetch available tools');
    }

    console.log('Available MCPs:', mcps?.length);

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

    console.log('Generated tools:', tools.length);

    // Enhanced system prompt with self-reflection capabilities
    const systemPrompt = `You are an advanced AI agent with access to various tools and self-reflection capabilities. You can help users by:

1. **Tool Usage**: Search the web, access knowledge bases, and use specialized tools
2. **Self-Reflection**: After using tools, analyze the results and determine if they meet the user's needs
3. **Task Planning**: Break down complex requests into manageable steps
4. **Error Recovery**: If a tool fails, try alternative approaches or explain limitations

**Available tools**: ${mcps?.map(m => `${m.title} - ${m.description}`).join(', ')}

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

    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: modelRequestBody
    });

    if (response.error) {
      console.error('AI Model Proxy error:', response.error);
      throw new Error(`AI Model Proxy error: ${response.error.message}`);
    }

    const data = response.data;
    console.log('AI Model response received');
    console.log('Response structure:', JSON.stringify(data, null, 2));

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
      console.log('Using OpenAI format - Assistant message:', assistantMessage);
    }
    // Check for NPAW response format with 'result' field
    else if (data.result) {
      assistantMessage = {
        content: data.result,
        role: 'assistant'
      };
      console.log('Using NPAW format - Assistant message:', assistantMessage);
    }
    // Check for other direct response formats
    else if (data.content || data.message) {
      assistantMessage = {
        content: data.content || data.message,
        role: 'assistant'
      };
      console.log('Using direct format - Assistant message:', assistantMessage);
    }
    // Check if data itself is the message
    else if (typeof data === 'string') {
      assistantMessage = {
        content: data,
        role: 'assistant'
      };
      console.log('Using string format - Assistant message:', assistantMessage);
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

    // Check if AI wants to call any tools (only for OpenAI format)
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const parameters = JSON.parse(toolCall.function.arguments);
        
        console.log('Executing tool:', functionName, 'with parameters:', parameters);
        
        // Track tool progress
        const toolProgressItem = {
          name: functionName,
          status: 'executing',
          parameters,
          startTime: new Date().toISOString()
        };
        toolProgress.push(toolProgressItem);
        
        // Extract MCP ID from function name
        const mcpKey = functionName.replace('execute_', '');
        const targetMcp = mcps?.find(m => m.default_key === mcpKey || m.id === mcpKey);
        
        if (!targetMcp) {
          console.error('Tool not found:', mcpKey);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({ error: 'Tool not found' })
          });
          
          toolProgressItem.status = 'failed';
          toolProgressItem.error = 'Tool not found';
          
          toolsUsed.push({
            name: functionName,
            parameters,
            result: { error: 'Tool not found' },
            success: false
          });
          continue;
        }

        try {
          console.log('Using MCP endpoint:', targetMcp.endpoint);
          let mcpResult;
          
          // Check if endpoint looks like an Edge Function name (no protocol)
          if (targetMcp.endpoint.indexOf('http') !== 0) {
            console.log('Calling Edge Function:', targetMcp.endpoint);
            const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(targetMcp.endpoint, {
              body: parameters
            });
            
            if (edgeError) {
              console.error('Edge function error:', edgeError);
              throw new Error(`Edge function error: ${edgeError.message}`);
            }
            
            mcpResult = edgeResult;
            console.log('Edge function result:', mcpResult);
          } else {
            console.log('Calling external API:', targetMcp.endpoint);
            const apiResponse = await fetch(targetMcp.endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parameters),
            });
            
            if (!apiResponse.ok) {
              throw new Error(`API error: ${apiResponse.status}`);
            }
            
            mcpResult = await apiResponse.json();
          }
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(mcpResult)
          });

          toolProgressItem.status = 'completed';
          toolProgressItem.endTime = new Date().toISOString();
          toolProgressItem.result = mcpResult;

          toolsUsed.push({
            name: functionName,
            parameters,
            result: mcpResult,
            success: true
          });
          
        } catch (error) {
          console.error('Tool execution error:', error);
          const errorResult = { error: error.message };
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(errorResult)
          });

          toolProgressItem.status = 'failed';
          toolProgressItem.error = error.message;
          toolProgressItem.endTime = new Date().toISOString();

          toolsUsed.push({
            name: functionName,
            parameters,
            result: errorResult,
            success: false
          });
        }
      }
      
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
4. Provide a clear, helpful response based on all available information.

Be transparent about any limitations or failures.`
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
      
      // Generate self-reflection summary
      selfReflection = `Used ${toolsUsed.length} tool(s). ${toolsUsed.filter(t => t.success).length} succeeded, ${toolsUsed.filter(t => !t.success).length} failed.`;
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
        toolProgress,
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
