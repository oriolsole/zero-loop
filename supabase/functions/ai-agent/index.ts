
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { message, conversationHistory = [], userId, sessionId, streaming = false } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('AI Agent request:', { 
      message, 
      historyLength: conversationHistory.length, 
      userId, 
      sessionId,
      streaming 
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

    // Prepare messages for OpenAI
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

    // Make OpenAI API call with function calling
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000,
        stream: streaming
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    if (streaming) {
      // Handle streaming response
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    console.log('OpenAI response:', assistantMessage);

    let finalResponse = assistantMessage.content;
    let toolsUsed: any[] = [];
    let selfReflection = '';

    // Check if OpenAI wants to call any tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const parameters = JSON.parse(toolCall.function.arguments);
        
        console.log('Executing tool:', functionName, 'with parameters:', parameters);
        
        // Extract MCP ID from function name
        const mcpKey = functionName.replace('execute_', '');
        const targetMcp = mcps?.find(m => m.default_key === mcpKey || m.id === mcpKey);
        
        if (!targetMcp) {
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({ error: 'Tool not found' })
          });
          continue;
        }

        try {
          let mcpResult;
          
          if (targetMcp.endpoint.indexOf('http') !== 0) {
            const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(targetMcp.endpoint, {
              body: parameters
            });
            
            if (edgeError) {
              throw new Error(`Edge function error: ${edgeError.message}`);
            }
            
            mcpResult = edgeResult;
          } else {
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

          toolsUsed.push({
            name: functionName,
            parameters,
            result: errorResult,
            success: false
          });
        }
      }
      
      // Make another OpenAI call with the tool results and self-reflection
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
      
      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: followUpMessages,
          temperature: 0.7,
          max_tokens: 2000
        }),
      });
      
      if (!followUpResponse.ok) {
        throw new Error(`OpenAI follow-up API error: ${followUpResponse.status}`);
      }
      
      const followUpData = await followUpResponse.json();
      finalResponse = followUpData.choices[0].message.content;
      
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
          success: t.success
        })),
        selfReflection,
        sessionId
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
