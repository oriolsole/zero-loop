import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

import { executeTools } from './tool-executor.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt } from './system-prompts.ts';
import { extractAssistantMessage } from './response-handler.ts';

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
    const { message, conversationHistory = [], userId, sessionId, streaming = false, modelSettings, requestType = 'execution' } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('AI Agent request:', { 
      message, 
      historyLength: conversationHistory.length, 
      userId, 
      sessionId,
      streaming,
      modelSettings,
      requestType
    });

    // Store conversation in database if userId and sessionId provided
    if (userId && sessionId && requestType === 'execution') {
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
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search-v2', 'jira-tools', 'web-scraper']);

    if (mcpError) {
      console.error('Error fetching MCPs:', mcpError);
      throw new Error('Failed to fetch available tools');
    }

    console.log('Available MCPs:', mcps?.map(m => ({ title: m.title, endpoint: m.endpoint, key: m.default_key })));

    // Convert MCPs to OpenAI function definitions
    const tools = convertMCPsToTools(mcps);
    console.log('Generated tools:', tools.map(t => t.function.name));

    // Handle planning phase
    if (requestType === 'planning') {
      return await handlePlanningPhase(message, conversationHistory, tools, modelSettings, supabase);
    }

    // Handle execution phase (original behavior)
    return await handleExecutionPhase(message, conversationHistory, tools, mcps, userId, sessionId, streaming, modelSettings, supabase);

  } catch (error) {
    console.error('AI Agent error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
        details: 'Check the edge function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Handle the planning phase - AI analyzes request and explains what it will do
 */
async function handlePlanningPhase(
  message: string,
  conversationHistory: any[],
  tools: any[],
  modelSettings: any,
  supabase: any
) {
  console.log('Handling planning phase');

  const planningPrompt = `Analyze this user request and explain what you plan to do. Be concise but clear about your approach.

Available tools: ${tools.map(t => t.function.name).join(', ')}

User request: "${message}"

Respond with:
1. What you understand from the request
2. What tools (if any) you plan to use
3. Your approach to solving this

Keep it brief and conversational. Start with something like "I can help you with that" or "Let me think about this".`;

  const planningMessages = [
    {
      role: 'system',
      content: planningPrompt
    },
    {
      role: 'user',
      content: message
    }
  ];

  const modelRequestBody = {
    messages: planningMessages,
    temperature: 0.7,
    max_tokens: 200,
    stream: false,
    ...(modelSettings && {
      provider: modelSettings.provider,
      model: modelSettings.selectedModel,
      localModelUrl: modelSettings.localModelUrl
    })
  };

  console.log('Calling AI model for planning phase');

  const response = await supabase.functions.invoke('ai-model-proxy', {
    body: modelRequestBody
  });

  if (response.error) {
    console.error('AI Model Proxy error:', response.error);
    throw new Error(`AI Model Proxy error: ${response.error.message}`);
  }

  const data = response.data;
  const assistantMessage = extractAssistantMessage(data);

  if (!assistantMessage) {
    console.error('Failed to extract planning message from response');
    throw new Error('No valid planning response received from AI model');
  }

  console.log('Planning phase completed successfully');

  // Determine if tools will be used based on message content
  const willUseTool = detectToolUsage(message, tools);

  return new Response(
    JSON.stringify({
      success: true,
      reasoning: assistantMessage.content,
      willUseTool,
      phase: 'planning'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Handle the execution phase - original AI agent behavior
 */
async function handleExecutionPhase(
  message: string,
  conversationHistory: any[],
  tools: any[],
  mcps: any[],
  userId: string,
  sessionId: string,
  streaming: boolean,
  modelSettings: any,
  supabase: any
) {
  console.log('Handling execution phase');

  // Generate comprehensive system prompt
  const systemPrompt = generateSystemPrompt(mcps);

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

  // Let the model decide on tool usage naturally
  const modelRequestBody = {
    messages,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: 'auto',
    temperature: 0.7,
    max_tokens: 2000,
    stream: streaming,
    ...(modelSettings && {
      provider: modelSettings.provider,
      model: modelSettings.selectedModel,
      localModelUrl: modelSettings.localModelUrl
    })
  };

  console.log('Calling AI model for execution - tools available:', tools.length);

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
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  const assistantMessage = extractAssistantMessage(data);
  let fallbackUsed = data.fallback_used || false;
  let fallbackReason = data.fallback_reason || '';

  if (!assistantMessage) {
    console.error('Failed to extract assistant message from response:', JSON.stringify(data).substring(0, 500));
    throw new Error('No valid message content received from AI model');
  }

  console.log('Successfully extracted assistant message:', {
    hasContent: !!assistantMessage.content,
    hasToolCalls: !!assistantMessage.tool_calls,
    toolCallCount: assistantMessage.tool_calls?.length || 0
  });

  let finalResponse = assistantMessage.content;
  let toolsUsed: any[] = [];
  let selfReflection = '';
  let toolProgress: any[] = [];

  // Execute tools if the model chose to use them
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    console.log('AI model chose to use', assistantMessage.tool_calls.length, 'tools - executing...');
    
    const { toolResults, toolsUsed: executedTools, toolProgress: progress } = await executeTools(
      assistantMessage.tool_calls,
      mcps,
      userId,
      supabase
    );
    
    toolsUsed = executedTools;
    toolProgress = progress;
    
    // Make synthesis call with tool results
    console.log('Making synthesis call with tool results');
    const synthesizedResponse = await synthesizeToolResults(
      message,
      conversationHistory,
      toolsUsed,
      assistantMessage.content,
      modelSettings,
      supabase
    );
    
    if (synthesizedResponse) {
      finalResponse = synthesizedResponse;
    } else {
      finalResponse = createFallbackResponse(message, toolsUsed);
    }
    
    selfReflection = `Used ${toolsUsed.length} tools to complete the request.`;
    
    console.log('Tool execution and synthesis completed successfully');
  } else {
    console.log('AI model chose not to use tools - providing direct response');
    selfReflection = `Direct response - no tools needed.`;
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
      toolProgress,
      selfReflection,
      sessionId,
      fallbackUsed,
      fallbackReason
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Simple detection if tools will likely be used based on message content
 */
function detectToolUsage(message: string, tools: any[]): boolean {
  const lowerMessage = message.toLowerCase();
  
  // URL patterns
  if (/https?:\/\/[^\s]+/.test(message) || /\w+\.\w+/.test(message)) {
    return true;
  }
  
  // Search keywords
  if (/\b(search|find|look\s+up|access|retrieve|scrape|get\s+content)\b/.test(lowerMessage)) {
    return true;
  }
  
  // GitHub keywords
  if (/\b(github|repository|repo)\b/.test(lowerMessage)) {
    return true;
  }
  
  // Knowledge keywords
  if (/\b(my|knowledge|documents?|notes?)\b/.test(lowerMessage)) {
    return true;
  }
  
  return false;
}

async function synthesizeToolResults(
  originalMessage: string,
  conversationHistory: any[],
  toolsUsed: any[],
  originalResponse: string,
  modelSettings: any,
  supabase: any
): Promise<string | null> {
  try {
    const toolResultsSummary = toolsUsed.map(tool => {
      if (tool.success && tool.result) {
        return `${tool.name}: ${typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result)}`;
      }
      return `${tool.name}: Failed`;
    }).join('\n');

    const synthesisMessages = [
      {
        role: 'system',
        content: `Provide a direct, helpful answer to the user's question using the tool results. Be concise and informative.

User asked: "${originalMessage}"

Tool results:
${toolResultsSummary}

Give a clear answer based on this information.`
      },
      {
        role: 'user',
        content: originalMessage
      }
    ];

    const synthesisRequestBody = {
      messages: synthesisMessages,
      temperature: 0.3,
      max_tokens: 800,
      ...(modelSettings && {
        provider: modelSettings.provider,
        model: modelSettings.selectedModel,
        localModelUrl: modelSettings.localModelUrl
      })
    };

    console.log('Making synthesis call to AI model');

    const synthesisResponse = await supabase.functions.invoke('ai-model-proxy', {
      body: synthesisRequestBody
    });
    
    if (synthesisResponse.error) {
      console.error('Synthesis call failed:', synthesisResponse.error);
      return null;
    }
    
    const synthesisData = synthesisResponse.data;
    const synthesisMessage = extractAssistantMessage(synthesisData);
    
    if (synthesisMessage && synthesisMessage.content) {
      console.log('Synthesis successful, returning synthesized response');
      return synthesisMessage.content;
    } else {
      console.error('Failed to extract synthesis response');
      return null;
    }
    
  } catch (error) {
    console.error('Error in synthesis:', error);
    return null;
  }
}

function createFallbackResponse(originalMessage: string, toolsUsed: any[]): string {
  const successfulTools = toolsUsed.filter(t => t.success);
  
  if (successfulTools.length === 0) {
    return "I apologize, but I wasn't able to find the information you requested at this time.";
  }
  
  const results = successfulTools.map(tool => {
    if (tool.result && typeof tool.result === 'string') {
      return tool.result.substring(0, 200) + (tool.result.length > 200 ? '...' : '');
    }
    return 'Information found';
  }).join('\n\n');
  
  return `Based on my search, here's what I found:\n\n${results}`;
}
