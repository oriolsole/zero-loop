
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

import { executeTools } from './tool-executor.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt } from './system-prompts.ts';
import { extractAssistantMessage } from './response-handler.ts';
import { simpleAnalyzeToolRequirements, logSimpleToolDecision } from './enhanced-tool-decision.ts';

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

    // Simple tool analysis for UI and logging purposes only
    const toolDecision = simpleAnalyzeToolRequirements(message, conversationHistory);
    logSimpleToolDecision(toolDecision, message);

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
      tool_choice: 'auto', // Always let model decide
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

    console.log('Calling AI model with natural tool selection - tools available:', tools.length);

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

    // Extract assistant message - this is the critical fix
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
      
      selfReflection = `Used ${toolsUsed.length} tools for ${toolDecision.detectedType} request.`;
      
      console.log('Tool execution and synthesis completed successfully');
    } else {
      console.log('AI model chose not to use tools - providing direct response');
      selfReflection = `Direct response for ${toolDecision.detectedType} request - no tools needed.`;
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
        tool_decision: toolDecision,
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
        fallbackReason,
        toolDecision
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
 * Synthesize tool results into a coherent response
 */
async function synthesizeToolResults(
  originalMessage: string,
  conversationHistory: any[],
  toolsUsed: any[],
  originalResponse: string,
  modelSettings: any,
  supabase: any
): Promise<string | null> {
  try {
    // Create synthesis prompt with tool results
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

/**
 * Create a fallback response when synthesis fails
 */
function createFallbackResponse(originalMessage: string, toolsUsed: any[]): string {
  const successfulTools = toolsUsed.filter(t => t.success);
  
  if (successfulTools.length === 0) {
    return "I apologize, but I wasn't able to find the information you requested at this time.";
  }
  
  // Try to extract useful information from tool results
  const results = successfulTools.map(tool => {
    if (tool.result && typeof tool.result === 'string') {
      return tool.result.substring(0, 200) + (tool.result.length > 200 ? '...' : '');
    }
    return 'Information found';
  }).join('\n\n');
  
  return `Based on my search, here's what I found:\n\n${results}`;
}
