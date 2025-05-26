
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
      enhancedSystemPrompt += `\n\n**ENHANCED TOOL EXECUTION DIRECTIVE**: 
Based on enhanced analysis, this message REQUIRES tool usage with ${enhancedDecision.confidence.toFixed(2)} confidence.
Request Type: ${enhancedDecision.detectedType}
Complexity: ${enhancedDecision.complexity}
Execution Plan: ${enhancedDecision.estimatedSteps} steps
Reasoning: ${enhancedDecision.reasoning}
Required tools: ${enhancedDecision.suggestedTools.join(', ')}
${enhancedDecision.fallbackStrategy ? `Fallback: ${enhancedDecision.fallbackStrategy}` : ''}
You MUST generate appropriate tool calls for this request. Do not provide generic responses.`;
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
      console.log('Enhanced decision analysis indicated tools were required but AI model did not generate tool calls');
      console.log('Fallback strategy:', enhancedDecision.fallbackStrategy);
      
      const forcedResult = await executeBasedOnDecision(
        toolDecision, // Use legacy format for compatibility
        message,
        githubInfo,
        mcps,
        userId,
        supabase
      );
      
      if (forcedResult) {
        toolsUsed = forcedResult.toolsUsed;
        toolProgress = forcedResult.toolProgress;
        
        // CRITICAL FIX: Make follow-up call to synthesize the results
        console.log('Making synthesis call with forced tool results');
        const synthesizedResponse = await synthesizeToolResults(
          message,
          conversationHistory,
          toolsUsed,
          forcedResult.finalResponse,
          modelSettings,
          supabase
        );
        
        finalResponse = synthesizedResponse || forcedResult.finalResponse;
        selfReflection = forcedResult.selfReflection + `\n\nFallback Execution: Applied enhanced fallback strategy due to AI model not generating expected tool calls. ${enhancedDecision.fallbackStrategy}`;
      } else if (enhancedDecision.fallbackStrategy) {
        // Apply fallback strategy as text response
        finalResponse = `I understand you're looking for ${enhancedDecision.detectedType} information. ${enhancedDecision.fallbackStrategy}`;
        selfReflection = `Applied fallback strategy due to tool execution failure: ${enhancedDecision.fallbackStrategy}`;
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
      
      console.log('Enhanced tool execution summary:', {
        total: toolsUsed.length,
        successful: toolsUsed.filter(t => t.success).length,
        failed: toolsUsed.filter(t => !t.success).length,
        expectedSteps: enhancedDecision.estimatedSteps,
        actualSteps: toolsUsed.length
      });
      
      // CRITICAL FIX: Improved follow-up call with better synthesis prompt
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
        console.error('Synthesis failed, falling back to original response');
        finalResponse = assistantMessage.content;
      }
      
      // Check if fallback was used in follow-up
      if (data.fallback_used) {
        fallbackUsed = true;
        fallbackReason = data.fallback_reason;
      }
      
      // Generate enhanced self-reflection summary
      selfReflection = generateSelfReflection(toolsUsed, toolProgress);
      selfReflection += `\n\nEnhanced Analysis: Executed ${enhancedDecision.detectedType} request with ${enhancedDecision.complexity} complexity. Expected ${enhancedDecision.estimatedSteps} steps, used ${toolsUsed.length} tools. Confidence: ${enhancedDecision.confidence.toFixed(2)}.`;

      console.log('Enhanced synthesis response completed successfully');
    } else {
      console.log('No tool calls were made by the AI model and none were forced');
      selfReflection = `No tools were used for this request. Enhanced analysis: ${enhancedDecision.reasoning} (Confidence: ${enhancedDecision.confidence.toFixed(2)})`;
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
        tool_decision: enhancedDecision, // Store the full enhanced decision
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
        toolDecision: enhancedDecision // Return the enhanced decision
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
 * NEW FUNCTION: Synthesize tool results into a coherent response
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
        return `Tool: ${tool.name}\nResult: ${typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result)}`;
      }
      return `Tool: ${tool.name}\nStatus: Failed - ${tool.error || 'Unknown error'}`;
    }).join('\n\n');

    const synthesisMessages = [
      {
        role: 'system',
        content: `You are an AI assistant that synthesizes tool results into helpful, conversational responses. 

CRITICAL INSTRUCTIONS:
1. Use the tool results to provide a comprehensive, helpful answer to the user's question
2. Don't just list the results - synthesize them into a coherent, informative response
3. If the tools found relevant information, use it to directly answer the user's question
4. Be conversational and helpful, not robotic
5. If tool results are incomplete or failed, acknowledge limitations but provide what information you can
6. Focus on being helpful and informative based on the available data

The user asked: "${originalMessage}"

Available tool results:
${toolResultsSummary}

Provide a helpful, synthesized response based on this information.`
      },
      ...conversationHistory.slice(-3), // Include some recent context
      {
        role: 'user',
        content: originalMessage
      }
    ];

    const synthesisRequestBody = {
      messages: synthesisMessages,
      temperature: 0.7,
      max_tokens: 1500,
      // Pass model settings if provided
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
