
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

    const { message, conversationHistory = [] } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('AI Agent request:', { message, historyLength: conversationHistory.length });

    // Fetch available MCPs from the database
    const { data: mcps, error: mcpError } = await supabase
      .from('mcps')
      .select('*')
      .eq('isDefault', true); // Only use default MCPs for now

    if (mcpError) {
      console.error('Error fetching MCPs:', mcpError);
      throw new Error('Failed to fetch available tools');
    }

    console.log('Available MCPs:', mcps?.length);

    // Convert MCPs to OpenAI function definitions
    const tools = mcps?.map(mcp => {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      // Parse parameters if they're stored as JSON strings
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

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: `You are an AI agent with access to various tools. You can help users by:
1. Searching the web for information
2. Searching the knowledge base
3. Using other available tools

When you need to use a tool, call the appropriate function. You can use multiple tools in sequence if needed.
Be conversational and helpful. Explain what you're doing when you use tools.

Available tools: ${mcps?.map(m => `${m.title} - ${m.description}`).join(', ')}`
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
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    console.log('OpenAI response:', assistantMessage);

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
          // Execute the MCP
          let mcpResult;
          
          if (targetMcp.endpoint.indexOf('http') !== 0) {
            // It's a Supabase Edge Function
            const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(targetMcp.endpoint, {
              body: parameters
            });
            
            if (edgeError) {
              throw new Error(`Edge function error: ${edgeError.message}`);
            }
            
            mcpResult = edgeResult;
          } else {
            // It's an external API
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
          
        } catch (error) {
          console.error('Tool execution error:', error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({ error: error.message })
          });
        }
      }
      
      // Make another OpenAI call with the tool results
      const followUpMessages = [
        ...messages,
        assistantMessage,
        ...toolResults
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
          max_tokens: 1500
        }),
      });
      
      if (!followUpResponse.ok) {
        throw new Error(`OpenAI follow-up API error: ${followUpResponse.status}`);
      }
      
      const followUpData = await followUpResponse.json();
      const finalMessage = followUpData.choices[0].message;
      
      return new Response(
        JSON.stringify({
          success: true,
          message: finalMessage.content,
          toolsUsed: assistantMessage.tool_calls?.map(tc => ({
            name: tc.function.name,
            parameters: JSON.parse(tc.function.arguments)
          })) || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No tools were called, return the assistant's message directly
    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage.content,
        toolsUsed: []
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
