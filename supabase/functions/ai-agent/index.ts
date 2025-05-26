import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

import { executeTools } from './tool-executor.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt } from './system-prompts.ts';
import { extractAssistantMessage } from './response-handler.ts';
import { detectComplexQuery, shouldUseLearningLoop } from './learning-loop-detector.ts';
import { persistInsightAsKnowledgeNode } from './knowledge-persistence.ts';
import { getRelevantKnowledge } from './knowledge-retrieval.ts';

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

    // Check if this requires learning loop integration
    const complexityAnalysis = await detectComplexQuery(message, conversationHistory);
    const useKnowledgeLoop = shouldUseLearningLoop(complexityAnalysis);

    console.log('Query complexity analysis:', complexityAnalysis);
    console.log('Using learning loop:', useKnowledgeLoop);

    if (useKnowledgeLoop) {
      // Use unified reasoning with learning loop integration
      return await handleComplexQueryWithLearningLoop(
        message, 
        conversationHistory, 
        userId, 
        sessionId, 
        modelSettings, 
        supabase,
        complexityAnalysis
      );
    } else {
      // Use standard tool chaining for simple queries
      return await handleSimpleQuery(
        message, 
        conversationHistory, 
        userId, 
        sessionId, 
        modelSettings, 
        streaming, 
        supabase
      );
    }

  } catch (error) {
    console.error('AI Agent error:', error);
    
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
 * Handle complex queries using learning loop integration
 */
async function handleComplexQueryWithLearningLoop(
  message: string,
  conversationHistory: any[],
  userId: string | null,
  sessionId: string | null,
  modelSettings: any,
  supabase: any,
  complexityAnalysis: any
): Promise<Response> {
  console.log('Starting complex query with learning loop integration');
  
  // 1. Retrieve relevant existing knowledge
  const relevantKnowledge = await getRelevantKnowledge(message, userId, supabase);
  console.log('Retrieved relevant knowledge:', relevantKnowledge?.length || 0, 'nodes');

  // 2. Get available tools
  const { data: mcps, error: mcpError } = await supabase
    .from('mcps')
    .select('*')
    .eq('isDefault', true)
    .in('default_key', ['web-search', 'github-tools', 'knowledge-search-v2', 'jira-tools', 'web-scraper']);

  if (mcpError) {
    throw new Error('Failed to fetch available tools');
  }

  const tools = convertMCPsToTools(mcps);
  const systemPrompt = generateSystemPrompt(mcps);

  // 3. Execute iterative reasoning loop
  let iteration = 0;
  const maxIterations = 4;
  let accumulatedContext: any[] = [];
  let stopSignalReached = false;
  let finalResponse = '';

  // Enhanced system prompt for learning loop integration
  const learningLoopPrompt = `${systemPrompt}

**LEARNING LOOP MODE ACTIVATED**

You are now in learning loop mode for a complex query. Your goal is to:
1. Break down the complex question into steps
2. Use tools iteratively to gather information
3. Build knowledge progressively across iterations
4. Synthesize insights and persist valuable knowledge
5. Only provide final response when you have sufficient information

Relevant existing knowledge:
${relevantKnowledge?.map(node => `- ${node.title}: ${node.description}`).join('\n') || 'No relevant prior knowledge found'}

Query complexity: ${complexityAnalysis.complexity}
Suggested approach: ${complexityAnalysis.suggestedApproach}
Required steps: ${complexityAnalysis.requiredSteps?.join(', ') || 'Not specified'}

Continue until you have enough information to provide a comprehensive answer.`;

  while (!stopSignalReached && iteration < maxIterations) {
    iteration++;
    console.log(`Learning loop iteration ${iteration}/${maxIterations}`);

    // Prepare messages with accumulated context
    const iterationMessages = [
      {
        role: 'system',
        content: learningLoopPrompt
      },
      ...conversationHistory,
      {
        role: 'user',
        content: iteration === 1 ? message : `Continue with iteration ${iteration}. Previous results: ${JSON.stringify(accumulatedContext.slice(-2))}`
      }
    ];

    // Get AI decision on next steps
    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: iterationMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel,
          localModelUrl: modelSettings.localModelUrl
        })
      }
    });

    if (response.error) {
      throw new Error(`AI Model Proxy error: ${response.error.message}`);
    }

    const assistantMessage = extractAssistantMessage(response.data);
    if (!assistantMessage) {
      throw new Error('No valid message content received from AI model');
    }

    // Execute tools if chosen
    let toolResults: any[] = [];
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(`Executing ${assistantMessage.tool_calls.length} tools in iteration ${iteration}`);
      
      const { toolResults: results, toolsUsed } = await executeTools(
        assistantMessage.tool_calls,
        mcps,
        userId,
        supabase
      );
      
      toolResults = results;
      accumulatedContext.push({
        iteration,
        response: assistantMessage.content,
        toolsUsed,
        toolResults: results
      });
    } else {
      accumulatedContext.push({
        iteration,
        response: assistantMessage.content,
        reasoning: 'No tools used - direct response'
      });
    }

    // Check if we should continue or stop
    const shouldContinue = await evaluateIterationCompletion(
      message,
      accumulatedContext,
      assistantMessage.content,
      modelSettings,
      supabase
    );

    if (!shouldContinue || iteration >= maxIterations) {
      stopSignalReached = true;
      finalResponse = assistantMessage.content;
    }
  }

  // 4. Synthesize final response with all accumulated context
  if (accumulatedContext.length > 1) {
    console.log('Synthesizing final response from', accumulatedContext.length, 'iterations');
    
    const synthesisResponse = await synthesizeIterativeResults(
      message,
      accumulatedContext,
      modelSettings,
      supabase
    );
    
    if (synthesisResponse) {
      finalResponse = synthesisResponse;
    }
  }

  // 5. Persist valuable insights as knowledge nodes
  if (userId && accumulatedContext.length > 0) {
    await persistInsightAsKnowledgeNode(
      message,
      finalResponse,
      accumulatedContext,
      userId,
      complexityAnalysis,
      supabase
    );
  }

  // 6. Store final response
  if (userId && sessionId) {
    await supabase.from('agent_conversations').insert({
      user_id: userId,
      session_id: sessionId,
      role: 'assistant',
      content: finalResponse,
      tools_used: accumulatedContext.flatMap(ctx => ctx.toolsUsed || []),
      created_at: new Date().toISOString()
    });
  }

  console.log('Learning loop completed after', iteration, 'iterations');

  return new Response(
    JSON.stringify({
      success: true,
      message: finalResponse,
      learningLoopUsed: true,
      iterations: iteration,
      accumulatedContext: accumulatedContext.length,
      toolsUsed: accumulatedContext.flatMap(ctx => ctx.toolsUsed || []),
      sessionId
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Handle simple queries using standard tool chaining
 */
async function handleSimpleQuery(
  message: string,
  conversationHistory: any[],
  userId: string | null,
  sessionId: string | null,
  modelSettings: any,
  streaming: boolean,
  supabase: any
): Promise<Response> {
  // Fetch available MCPs from the database
  const { data: mcps, error: mcpError } = await supabase
    .from('mcps')
    .select('*')
    .eq('isDefault', true)
    .in('default_key', ['web-search', 'github-tools', 'knowledge-search-v2', 'jira-tools', 'web-scraper']);

  if (mcpError) {
    throw new Error('Failed to fetch available tools');
  }

  const tools = convertMCPsToTools(mcps);
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

  const response = await supabase.functions.invoke('ai-model-proxy', {
    body: modelRequestBody
  });

  if (response.error) {
    throw new Error(`AI Model Proxy error: ${response.error.message}`);
  }

  const data = response.data;

  if (streaming) {
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  const assistantMessage = extractAssistantMessage(data);
  if (!assistantMessage) {
    throw new Error('No valid message content received from AI model');
  }

  let finalResponse = assistantMessage.content;
  let toolsUsed: any[] = [];

  // Execute tools if the model chose to use them
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const { toolResults, toolsUsed: executedTools } = await executeTools(
      assistantMessage.tool_calls,
      mcps,
      userId,
      supabase
    );
    
    toolsUsed = executedTools;
    
    // Make synthesis call with tool results
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
    }
  }

  // Store assistant response in database
  if (userId && sessionId) {
    await supabase.from('agent_conversations').insert({
      user_id: userId,
      session_id: sessionId,
      role: 'assistant',
      content: finalResponse,
      tools_used: toolsUsed,
      created_at: new Date().toISOString()
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: finalResponse,
      learningLoopUsed: false,
      toolsUsed: toolsUsed.map(t => ({
        name: t.name,
        parameters: t.parameters,
        success: t.success,
        result: t.result
      })),
      sessionId
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Evaluate if iteration should continue
 */
async function evaluateIterationCompletion(
  originalMessage: string,
  accumulatedContext: any[],
  currentResponse: string,
  modelSettings: any,
  supabase: any
): Promise<boolean> {
  try {
    const evaluationMessages = [
      {
        role: 'system',
        content: `Evaluate if more information is needed to fully answer the user's question. 
        
        Respond with JSON: {"continue": true/false, "reason": "explanation"}
        
        Continue if:
        - The answer is incomplete or vague
        - Important aspects of the question remain unanswered
        - More context or data would significantly improve the response
        
        Stop if:
        - The question has been thoroughly answered
        - Sufficient information has been gathered
        - Additional iterations won't add meaningful value`
      },
      {
        role: 'user',
        content: `Original question: "${originalMessage}"
        
        Current accumulated context: ${JSON.stringify(accumulatedContext, null, 2)}
        
        Latest response: "${currentResponse}"
        
        Should I continue gathering more information?`
      }
    ];

    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: evaluationMessages,
        temperature: 0.3,
        max_tokens: 200,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel,
          localModelUrl: modelSettings.localModelUrl
        })
      }
    });

    if (response.error) {
      console.error('Error in iteration evaluation:', response.error);
      return false; // Stop on error
    }

    const evaluationMessage = extractAssistantMessage(response.data);
    if (evaluationMessage?.content) {
      try {
        const evaluation = JSON.parse(evaluationMessage.content);
        console.log('Iteration evaluation:', evaluation);
        return evaluation.continue === true;
      } catch (parseError) {
        console.error('Error parsing evaluation response:', parseError);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error('Error in evaluateIterationCompletion:', error);
    return false;
  }
}

/**
 * Synthesize results from multiple iterations
 */
async function synthesizeIterativeResults(
  originalMessage: string,
  accumulatedContext: any[],
  modelSettings: any,
  supabase: any
): Promise<string | null> {
  try {
    const contextSummary = accumulatedContext.map((ctx, idx) => 
      `Iteration ${ctx.iteration}: ${ctx.response}\nTools used: ${ctx.toolsUsed?.map(t => t.name).join(', ') || 'none'}`
    ).join('\n\n');

    const synthesisMessages = [
      {
        role: 'system',
        content: `Synthesize a comprehensive final answer based on multiple iterations of research and tool usage.

        Create a coherent, well-structured response that:
        1. Directly answers the original question
        2. Integrates insights from all iterations
        3. Provides clear, actionable information
        4. Maintains a helpful, professional tone`
      },
      {
        role: 'user',
        content: `Original question: "${originalMessage}"

        Research iterations:
        ${contextSummary}

        Please provide a comprehensive final answer.`
      }
    ];

    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: synthesisMessages,
        temperature: 0.5,
        max_tokens: 1000,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel,
          localModelUrl: modelSettings.localModelUrl
        })
      }
    });

    if (response.error) {
      console.error('Error in synthesis:', response.error);
      return null;
    }

    const synthesisMessage = extractAssistantMessage(response.data);
    return synthesisMessage?.content || null;

  } catch (error) {
    console.error('Error in synthesizeIterativeResults:', error);
    return null;
  }
}

/**
 * Synthesize tool results into a coherent response (existing function)
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

    const synthesisResponse = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: synthesisMessages,
        temperature: 0.3,
        max_tokens: 800,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel,
          localModelUrl: modelSettings.localModelUrl
        })
      }
    });
    
    if (synthesisResponse.error) {
      console.error('Synthesis call failed:', synthesisResponse.error);
      return null;
    }
    
    const synthesisMessage = extractAssistantMessage(synthesisResponse.data);
    return synthesisMessage?.content || null;
    
  } catch (error) {
    console.error('Error in synthesis:', error);
    return null;
  }
}
