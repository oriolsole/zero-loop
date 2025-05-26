
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

import { parseGitHubUrl, detectGitHubRequest } from './github-utils.ts';
import { detectSearchRequest } from './search-utils.ts';
import { executeTools } from './tool-executor.ts';
import { executeBasedOnDecision } from './enhanced-forced-tools.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt } from './system-prompts.ts';
import { extractAssistantMessage, generateSelfReflection } from './response-handler.ts';
import { analyzeToolRequirements, logToolDecision } from './tool-decision-logger.ts';
import { enhancedAnalyzeToolRequirements, logEnhancedToolDecision } from './enhanced-tool-decision.ts';

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
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search-v2']);

    if (mcpError) {
      console.error('Error fetching MCPs:', mcpError);
      throw new Error('Failed to fetch available tools');
    }

    console.log('Available MCPs:', mcps?.map(m => ({ title: m.title, endpoint: m.endpoint, key: m.default_key })));

    // Convert MCPs to OpenAI function definitions
    const tools = convertMCPsToTools(mcps);
    console.log('Generated tools:', tools.map(t => t.function.name));

    // ENHANCED TOOL DECISION ANALYSIS with Lovable principles
    const enhancedDecision = enhancedAnalyzeToolRequirements(message);
    logEnhancedToolDecision(enhancedDecision, message);

    // Legacy analysis for backward compatibility
    const legacyDecision = analyzeToolRequirements(message);
    logToolDecision(legacyDecision, message);

    // Use enhanced decision for execution logic
    const toolDecision = {
      shouldUseTools: enhancedDecision.shouldUseTools,
      detectedType: enhancedDecision.detectedType,
      reasoning: enhancedDecision.reasoning,
      confidence: enhancedDecision.confidence,
      suggestedTools: enhancedDecision.suggestedTools
    };

    // Detect request types (legacy compatibility)
    const isSearchRequest = detectSearchRequest(message);
    const { isGitHubRequest, githubInfo } = detectGitHubRequest(message);

    console.log('Legacy detection - Is search request:', isSearchRequest);
    console.log('Legacy detection - Is GitHub request:', isGitHubRequest, githubInfo);
    console.log('Enhanced detection - Tool decision:', enhancedDecision);

    // Generate system prompt with enhanced tool usage instructions
    let enhancedSystemPrompt = generateSystemPrompt(mcps, isSearchRequest, isGitHubRequest);
    
    // Add enhanced directive based on complexity and confidence
    if (enhancedDecision.shouldUseTools) {
      enhancedSystemPrompt += `\n\nThis request requires tools. Use them to get the information needed and provide a direct, helpful answer.`;
    }

    // Prepare messages for AI model
    const messages = [
      {
        role: 'system',
        content: enhancedSystemPrompt
      },
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ];

    // Use tool choice based on enhanced confidence
    const toolChoice = enhancedDecision.shouldUseTools && enhancedDecision.confidence > 0.7 ? 'required' : 'auto';

    const modelRequestBody = {
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: toolChoice,
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

    console.log('Calling AI model proxy with enhanced analysis - tools:', tools.length, 'tool_choice:', toolChoice, 'confidence:', enhancedDecision.confidence);

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

    // Extract assistant message with defensive null checking
    const assistantMessage = extractAssistantMessage(data);
    let fallbackUsed = data.fallback_used || false;
    let fallbackReason = data.fallback_reason || '';

    if (!assistantMessage) {
      throw new Error('No valid message content received from AI model');
    }

    let finalResponse = assistantMessage.content;
    let toolsUsed: any[] = [];
    let selfReflection = '';
    let toolProgress: any[] = [];

    // ENHANCED FORCED TOOL EXECUTION with fallback strategies
    if (enhancedDecision.shouldUseTools && (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0)) {
      console.log('AI MODEL FAILED TO GENERATE REQUIRED TOOL CALLS - APPLYING ENHANCED FALLBACK STRATEGY');
      
      const forcedResult = await executeBasedOnDecision(
        toolDecision,
        message,
        githubInfo,
        mcps,
        userId,
        supabase
      );
      
      if (forcedResult) {
        toolsUsed = forcedResult.toolsUsed;
        toolProgress = forcedResult.toolProgress;
        
        // Make synthesis call to create a proper response
        console.log('Making synthesis call with forced tool results');
        const synthesizedResponse = await synthesizeToolResults(
          message,
          conversationHistory,
          toolsUsed,
          forcedResult.finalResponse,
          modelSettings,
          supabase
        );
        
        finalResponse = synthesizedResponse || createFallbackResponse(message, toolsUsed);
        selfReflection = `Enhanced Analysis: Used ${toolsUsed.length} tools with confidence ${enhancedDecision.confidence.toFixed(2)}.`;
      }
    }
    // Enhanced tool execution with detailed progress tracking
    else if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log('AI MODEL GENERATED TOOL CALLS - EXECUTING WITH ENHANCED MONITORING');
      const { toolResults, toolsUsed: executedTools, toolProgress: progress } = await executeTools(
        assistantMessage.tool_calls,
        mcps,
        userId,
        supabase
      );
      
      toolsUsed = executedTools;
      toolProgress = progress;
      
      // Make synthesis call with tool results
      console.log('Making enhanced synthesis call with tool results');
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
      
      // Check if fallback was used in follow-up
      if (data.fallback_used) {
        fallbackUsed = true;
        fallbackReason = data.fallback_reason;
      }
      
      // Generate enhanced self-reflection summary
      selfReflection = `Enhanced Analysis: Used ${toolsUsed.length} tools for ${enhancedDecision.detectedType} request.`;
      
      console.log('Enhanced synthesis response completed successfully');
    } else {
      console.log('No tool calls were made by the AI model and none were forced');
      selfReflection = `No tools needed for this ${enhancedDecision.detectedType} request.`;
    }

    // Store assistant response in database with enhanced decision data
    if (userId && sessionId) {
      await supabase.from('agent_conversations').insert({
        user_id: userId,
        session_id: sessionId,
        role: 'assistant',
        content: finalResponse,
        tools_used: toolsUsed,
        self_reflection: selfReflection,
        tool_decision: enhancedDecision,
        created_at: new Date().toISOString()
      });
    }

    console.log('Returning enhanced response with', toolsUsed.length, 'tools used');

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
        toolDecision: enhancedDecision
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
