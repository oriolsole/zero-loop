import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

import { executeTools } from './tool-executor.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt, createKnowledgeAwareMessages } from './system-prompts.ts';
import { extractAssistantMessage } from './response-handler.ts';
import { detectQueryComplexity, shouldUseLearningLoop } from './learning-loop-detector.ts';
import { persistInsightAsKnowledgeNode } from './knowledge-persistence.ts';
import { getRelevantKnowledge, logToolOveruse } from './knowledge-retrieval.ts';
import { handleProgressiveQuery } from './progressive-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Enhanced content validation with guaranteed non-null response
 */
function validateAndEnsureContent(content: any, context: string = 'Unknown'): string {
  console.log(`[CONTENT_VALIDATION] Validating content for ${context}:`, {
    contentType: typeof content,
    contentLength: content?.length || 0,
    isNull: content === null,
    isUndefined: content === undefined,
    isEmpty: !content || content.trim?.() === ''
  });

  // Handle null, undefined, or empty content with specific fallback messages
  if (!content) {
    const fallbackMessage = `I apologize, but I encountered an issue generating a response for your request (${context}). Please try again or rephrase your question.`;
    console.error(`[CONTENT_VALIDATION] Content validation failed for ${context}: content is null/undefined, using fallback`);
    return fallbackMessage;
  }

  // Handle non-string content
  if (typeof content !== 'string') {
    console.warn(`[CONTENT_VALIDATION] Content validation warning for ${context}: content is not a string, converting`);
    const stringContent = String(content);
    if (!stringContent.trim()) {
      const fallbackMessage = `I processed your request but encountered an issue formatting the response (${context}). Please try again.`;
      console.error(`[CONTENT_VALIDATION] Converted content is empty for ${context}, using fallback`);
      return fallbackMessage;
    }
    return stringContent;
  }

  // Handle empty string content
  if (!content.trim()) {
    const fallbackMessage = `I received your request but generated an empty response (${context}). Please try rephrasing your question.`;
    console.error(`[CONTENT_VALIDATION] Content validation failed for ${context}: content is empty string, using fallback`);
    return fallbackMessage;
  }

  console.log(`[CONTENT_VALIDATION] Content validation successful for ${context}: ${content.length} characters`);
  return content;
}

/**
 * Enhanced assistant message extraction with validation
 */
function extractAndValidateAssistantMessage(response: any, context: string = 'AI Response'): string {
  console.log(`[MESSAGE_EXTRACTION] Extracting assistant message for ${context}:`, {
    hasResponse: !!response,
    responseType: typeof response,
    hasChoices: response?.choices?.length > 0
  });

  try {
    const rawContent = extractAssistantMessage(response);
    const validatedContent = validateAndEnsureContent(rawContent, context);
    
    console.log(`[MESSAGE_EXTRACTION] Extraction result for ${context}:`, {
      originalLength: rawContent?.length || 0,
      validatedLength: validatedContent.length,
      wasModified: rawContent !== validatedContent
    });

    return validatedContent;
  } catch (error) {
    console.error(`[MESSAGE_EXTRACTION] Error extracting message for ${context}:`, error);
    return `I encountered an error processing the AI response (${context}). Please try your request again.`;
  }
}

/**
 * Absolute final validation before database insertion
 */
function finalDatabaseValidation(content: string, context: string): string {
  console.log(`[DB_VALIDATION] Final database validation for ${context}:`, {
    contentType: typeof content,
    contentLength: content?.length || 0,
    isValidString: typeof content === 'string' && content.trim().length > 0
  });

  if (!content || typeof content !== 'string' || !content.trim()) {
    const emergencyFallback = `I processed your request but encountered a technical issue preparing the response for storage. Your query was received and understood, but I cannot provide the specific answer at this moment. Please try again.`;
    console.error(`[DB_VALIDATION] EMERGENCY FALLBACK ACTIVATED for ${context} - original content was invalid:`, content);
    return emergencyFallback;
  }

  return content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], userId, sessionId, streaming = false, modelSettings, testMode = false } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('🤖 AI Agent request:', { 
      message, 
      historyLength: conversationHistory.length, 
      userId, 
      sessionId,
      streaming,
      modelSettings,
      testMode
    });

    // Store conversation in database if userId and sessionId provided (skip in test mode)
    if (userId && sessionId && !testMode) {
      const validatedUserMessage = validateAndEnsureContent(message, 'User Message');
      await supabase.from('agent_conversations').insert({
        user_id: userId,
        session_id: sessionId,
        role: 'user',
        content: validatedUserMessage,
        created_at: new Date().toISOString()
      });
    }

    // NEW: Progressive streaming approach
    if (streaming) {
      return await handleProgressiveStreaming(message, conversationHistory, userId, sessionId, modelSettings, supabase);
    }

    // Use AI to determine query complexity
    const complexityDecision = await detectQueryComplexity(message, conversationHistory, supabase, modelSettings);
    const useKnowledgeLoop = shouldUseLearningLoop(complexityDecision);

    console.log('🧠 AI complexity decision:', complexityDecision);
    console.log('🔄 Using learning loop:', useKnowledgeLoop);

    // In test mode, return complexity decision for validation
    if (testMode) {
      return new Response(
        JSON.stringify({
          success: true,
          complexity: complexityDecision,
          useKnowledgeLoop,
          message: `Test mode: Query classified as ${complexityDecision.classification}`,
          testMode: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (useKnowledgeLoop) {
      // Use unified reasoning with learning loop integration
      return await handleComplexQueryWithLearningLoop(
        message, 
        conversationHistory, 
        userId, 
        sessionId, 
        modelSettings, 
        supabase,
        complexityDecision
      );
    } else {
      // Use knowledge-first approach for simple queries
      return await handleSimpleQueryWithKnowledgeFirst(
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
    console.error('❌ AI Agent error:', error);
    
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
 * Create knowledge retrieval tool entry
 */
function createKnowledgeRetrievalTool(knowledgeTrackingInfo: any): any {
  if (!knowledgeTrackingInfo) return null;
  
  return {
    name: 'knowledge_retrieval',
    parameters: {
      query: knowledgeTrackingInfo.result?.query || 'Unknown query',
      searchMode: knowledgeTrackingInfo.searchMode || 'semantic',
      resultsCount: knowledgeTrackingInfo.result?.returnedResults || 0
    },
    result: {
      sources: knowledgeTrackingInfo.sources || [],
      searchType: knowledgeTrackingInfo.result?.searchType || 'unknown',
      totalResults: knowledgeTrackingInfo.result?.totalResults || 0,
      returnedResults: knowledgeTrackingInfo.result?.returnedResults || 0,
      message: knowledgeTrackingInfo.result?.message || null
    },
    success: knowledgeTrackingInfo.success
  };
}

/**
 * Create learning generation tool entry
 */
function createLearningGenerationTool(originalMessage: string, learningTrackingInfo: any): any {
  if (!learningTrackingInfo) return null;
  
  // Extract actual insight data from the learning tracking info
  const persistResult = learningTrackingInfo.result || {};
  const insights = persistResult.insights;
  
  // Parse insights if they're in string format
  let parsedInsights = null;
  if (typeof insights === 'string') {
    try {
      parsedInsights = JSON.parse(insights);
    } catch {
      // Keep as string if parsing fails
    }
  } else if (typeof insights === 'object') {
    parsedInsights = insights;
  }
  
  return {
    name: 'learning_generation',
    parameters: {
      query: originalMessage,
      originalMessage: originalMessage,
      complexity: persistResult.complexity || 'unknown',
      iterations: persistResult.iterations || 1
    },
    result: {
      nodeId: persistResult.nodeId,
      insights: parsedInsights || insights || 'Generated learning insights from complex query',
      complexity: persistResult.complexity,
      iterations: persistResult.iterations,
      iterationCount: persistResult.iterations,
      domain: parsedInsights?.domain,
      toolsUsed: persistResult.toolsInvolved || [],
      toolsInvolved: persistResult.toolsInvolved || [],
      persistenceStatus: learningTrackingInfo.success ? 'persisted' : 'failed'
    },
    success: learningTrackingInfo.success
  };
}

/**
 * Handle complex queries using learning loop integration with knowledge-first approach
 */
async function handleComplexQueryWithLearningLoop(
  message: string,
  conversationHistory: any[],
  userId: string | null,
  sessionId: string | null,
  modelSettings: any,
  supabase: any,
  complexityDecision: any
): Promise<Response> {
  console.log('🔄 Starting complex query with learning loop integration');
  console.log('🧠 AI reasoning:', complexityDecision.reasoning);
  
  // 1. Retrieve relevant existing knowledge FIRST
  const { knowledge: relevantKnowledge, trackingInfo: knowledgeTrackingInfo } = await getRelevantKnowledge(message, userId, supabase);
  console.log('📚 Retrieved relevant knowledge:', relevantKnowledge?.length || 0, 'nodes');

  // 2. Get available tools (updated to use new knowledge-search key)
  const { data: mcps, error: mcpError } = await supabase
    .from('mcps')
    .select('*')
    .eq('isDefault', true)
    .in('default_key', ['web-search', 'github-tools', 'knowledge-search', 'jira-tools', 'web-scraper']);

  if (mcpError) {
    throw new Error('Failed to fetch available tools');
  }

  const tools = convertMCPsToTools(mcps);
  const systemPrompt = generateSystemPrompt(mcps, relevantKnowledge);

  // 3. Execute iterative reasoning loop with knowledge-first approach
  let iteration = 0;
  const maxIterations = 4;
  let accumulatedContext: any[] = [];
  let stopSignalReached = false;
  let finalResponse = '';
  let finalToolsUsed: any[] = [];

  // Enhanced system prompt for learning loop integration with knowledge priority
  const learningLoopPrompt = `${systemPrompt}

**🔄 LEARNING LOOP MODE ACTIVATED**

The AI classifier determined this query is COMPLEX because: ${complexityDecision.reasoning}

Your enhanced goals:
1. **CHECK KNOWLEDGE BASE FIRST** - Use existing knowledge when available
2. Break down complex questions only if knowledge base is insufficient
3. Use tools iteratively to fill knowledge gaps
4. Build knowledge progressively across iterations
5. Synthesize insights and persist valuable new knowledge
6. Only provide final response when you have comprehensive information

Continue until you have enough information for a complete answer, but prioritize existing knowledge.`;

  while (!stopSignalReached && iteration < maxIterations) {
    iteration++;
    console.log(`🔄 Learning loop iteration ${iteration}/${maxIterations}`);

    // Prepare knowledge-aware messages
    const iterationMessages = createKnowledgeAwareMessages(
      learningLoopPrompt,
      conversationHistory,
      iteration === 1 ? message : `Continue with iteration ${iteration}. Previous results: ${JSON.stringify(accumulatedContext.slice(-2))}`,
      iteration === 1 ? relevantKnowledge : undefined
    );

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

    const assistantMessage = extractAndValidateAssistantMessage(response.data, `Learning Loop Iteration ${iteration}`);

    console.log('🤖 Iteration', iteration, 'assistant response length:', assistantMessage.length);

    // Execute tools if chosen (and log potential overuse)
    let toolResults: any[] = [];
    if (response.data?.choices?.[0]?.message?.tool_calls && response.data.choices[0].message.tool_calls.length > 0) {
      console.log(`🛠️ Executing ${response.data.choices[0].message.tool_calls.length} tools in iteration ${iteration}`);
      
      // Log potential tool overuse for debugging
      logToolOveruse(
        message, 
        relevantKnowledge || [], 
        response.data.choices[0].message.tool_calls.map((tc: any) => tc.function?.name || 'unknown')
      );
      
      const { toolResults: results, toolsUsed } = await executeTools(
        response.data.choices[0].message.tool_calls,
        mcps,
        userId,
        supabase
      );
      
      toolResults = results;
      finalToolsUsed = [...finalToolsUsed, ...toolsUsed];
      
      console.log('🔧 Tool results summary:', {
        toolCount: toolsUsed.length,
        successCount: toolsUsed.filter(t => t.success).length,
        resultLengths: results.map(r => typeof r === 'string' ? r.length : 'object')
      });
      
      accumulatedContext.push({
        iteration,
        response: assistantMessage,
        toolsUsed,
        toolResults: results
      });
    } else {
      accumulatedContext.push({
        iteration,
        response: assistantMessage,
        reasoning: 'Used knowledge base or direct response - no tools needed'
      });
    }

    // Check if we should continue or stop
    const shouldContinue = await evaluateIterationCompletion(
      message,
      accumulatedContext,
      assistantMessage,
      modelSettings,
      supabase
    );

    if (!shouldContinue || iteration >= maxIterations) {
      stopSignalReached = true;
      finalResponse = assistantMessage;
    }
  }

  // 4. Validate final response before proceeding
  finalResponse = validateAndEnsureContent(finalResponse, 'Complex Query Final Response');

  // 5. Synthesize final response if tools were used
  if (finalToolsUsed.length > 0) {
    console.log('🧠 Synthesizing tool results for complex query:', {
      toolCount: finalToolsUsed.length,
      iterations: iteration
    });
    
    const synthesizedResponse = await synthesizeToolResults(
      message,
      conversationHistory,
      finalToolsUsed,
      finalResponse,
      modelSettings,
      supabase
    );
    
    if (synthesizedResponse) {
      console.log('✅ Synthesis successful, response length:', synthesizedResponse.length);
      finalResponse = validateAndEnsureContent(synthesizedResponse, 'Complex Query Synthesized Response');
    } else {
      console.warn('⚠️ Synthesis failed, using enhanced fallback strategy');
      finalResponse = createEnhancedFallbackResponse(message, finalToolsUsed, accumulatedContext);
    }
  } else if (accumulatedContext.length > 1) {
    console.log('🧠 Synthesizing learning loop results from', accumulatedContext.length, 'iterations (no tools used)');
    
    const synthesisResponse = await synthesizeIterativeResults(
      message,
      accumulatedContext,
      modelSettings,
      supabase
    );
    
    if (synthesisResponse) {
      finalResponse = validateAndEnsureContent(synthesisResponse, 'Complex Query Iterative Synthesis');
    } else {
      console.warn('⚠️ Synthesis failed. Using fallback strategy.');
      const lastContext = accumulatedContext[accumulatedContext.length - 1];
      finalResponse = validateAndEnsureContent(lastContext?.response, 'Complex Query Last Context') || 'I processed your request but encountered an issue generating the response.';
    }
  }

  // Final validation before persistence
  finalResponse = validateAndEnsureContent(finalResponse, 'Complex Query Pre-Persistence');

  // 6. Persist valuable insights as knowledge nodes
  let learningTrackingInfo = null;
  if (userId && accumulatedContext.length > 0) {
    try {
      const persistResult = await persistInsightAsKnowledgeNode(
        message,
        finalResponse,
        accumulatedContext,
        userId,
        complexityDecision,
        supabase
      );
      
      learningTrackingInfo = {
        name: 'Learning Generation',
        success: true,
        result: {
          nodeId: persistResult?.nodeId || 'unknown',
          insights: persistResult?.insights || 'Generated learning insights from complex query',
          complexity: complexityDecision.classification,
          iterations: iteration,
          toolsInvolved: Array.from(new Set(
            accumulatedContext.flatMap(ctx => ctx.toolsUsed?.map(t => t.name) || [])
          ))
        }
      };
    } catch (error) {
      learningTrackingInfo = {
        name: 'Learning Generation',
        success: false,
        error: error.message || 'Failed to persist learning insights',
        result: {
          complexity: complexityDecision.classification,
          iterations: iteration
        }
      };
    }
  }

  // 7. Create tool entries for knowledge and learning operations
  const allToolsUsed = [...finalToolsUsed];
  
  // Add knowledge retrieval as a tool
  const knowledgeTool = createKnowledgeRetrievalTool(knowledgeTrackingInfo);
  if (knowledgeTool) {
    allToolsUsed.unshift(knowledgeTool); // Add at the beginning to show it was used first
  }
  
  // Add learning generation as a tool
  const learningTool = createLearningGenerationTool(message, learningTrackingInfo);
  if (learningTool) {
    allToolsUsed.push(learningTool); // Add at the end to show it was done last
  }

  // 8. Store final response with comprehensive tool tracking and validation
  if (userId && sessionId) {
    const validatedFinalResponse = validateAndEnsureContent(finalResponse, 'Complex Query Database Storage');
    await supabase.from('agent_conversations').insert({
      user_id: userId,
      session_id: sessionId,
      role: 'assistant',
      content: validatedFinalResponse,
      tools_used: allToolsUsed,
      ai_reasoning: complexityDecision.reasoning,
      created_at: new Date().toISOString()
    });
  }

  console.log('✅ Learning loop completed after', iteration, 'iterations');
  console.log('📏 Final response length:', finalResponse.length);

  return new Response(
    JSON.stringify({
      success: true,
      message: finalResponse,
      learningLoopUsed: true,
      iterations: iteration,
      knowledgeUsed: knowledgeTrackingInfo ? [knowledgeTrackingInfo] : [],
      learningInsights: learningTrackingInfo ? [learningTrackingInfo] : [],
      accumulatedContext: accumulatedContext.length,
      toolsUsed: allToolsUsed,
      aiReasoning: complexityDecision.reasoning,
      sessionId
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Enhanced fallback response generator that guarantees a non-null string
 */
function createEnhancedFallbackResponse(message: string, toolsUsed: any[], accumulatedContext: any[]): string {
  console.log('🔧 Creating enhanced fallback response for message:', message);
  
  try {
    if (toolsUsed && toolsUsed.length > 0) {
      // Format tool results into a readable response
      let response = `Here are the results for "${message}":\n\n`;
      
      let hasValidResults = false;
      for (const tool of toolsUsed) {
        if (tool && tool.success && tool.result) {
          const formattedResult = formatToolResult(tool.name, tool.result);
          if (formattedResult && formattedResult.trim()) {
            response += formattedResult;
            hasValidResults = true;
          }
        }
      }
      
      if (hasValidResults) {
        return validateAndEnsureContent(response, 'Enhanced Fallback with Tools');
      }
    }
    
    if (accumulatedContext && accumulatedContext.length > 0) {
      const lastContext = accumulatedContext[accumulatedContext.length - 1];
      if (lastContext && lastContext.response) {
        return validateAndEnsureContent(lastContext.response, 'Enhanced Fallback Last Context');
      }
    }
    
    // Final guarantee - return a meaningful message about the user's query
    return `I received your message "${message}" and attempted to process it, but encountered technical difficulties generating a complete response. Please try rephrasing your question or try again in a moment.`;
    
  } catch (error) {
    console.error('🔧 Error in createEnhancedFallbackResponse:', error);
    // Emergency fallback - guaranteed to work
    return `I'm experiencing technical difficulties processing your request "${message}". Please try again.`;
  }
}

/**
 * Format tool results into human-readable text with guaranteed output
 */
function formatToolResult(toolName: string, result: any): string {
  try {
    if (!toolName || !result) {
      return `Tool result: No data available\n\n`;
    }

    if (toolName.includes('jira')) {
      return formatJiraResult(result);
    }
    
    if (typeof result === 'string' && result.trim()) {
      return result.trim() + '\n\n';
    }
    
    if (Array.isArray(result)) {
      if (result.length === 0) {
        return `${toolName}: No results found\n\n`;
      }
      return result.map(item => 
        typeof item === 'string' ? item : JSON.stringify(item, null, 2)
      ).join('\n') + '\n\n';
    }
    
    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2) + '\n\n';
    }
    
    return `${toolName}: ${String(result)}\n\n`;
  } catch (error) {
    console.error('Error formatting tool result:', error);
    return `${toolName || 'Tool'}: Error formatting result\n\n`;
  }
}

/**
 * Format Jira results into readable lists with guaranteed output
 */
function formatJiraResult(result: any): string {
  try {
    if (!result) {
      return 'No Jira data available.\n\n';
    }

    if (Array.isArray(result)) {
      if (result.length === 0) {
        return 'No Jira projects found.\n\n';
      }
      
      let response = 'Available Jira Projects:\n\n';
      for (const project of result) {
        if (project && typeof project === 'object') {
          response += `• **${project.name || 'Unknown'}** (${project.key || 'N/A'})`;
          if (project.projectTypeKey) {
            response += ` - ${project.projectTypeKey}`;
          }
          response += '\n';
        }
      }
      return response + '\n';
    }
    
    return JSON.stringify(result, null, 2) + '\n\n';
  } catch (error) {
    console.error('Error formatting Jira result:', error);
    return 'Error formatting Jira results.\n\n';
  }
}

/**
 * Handle simple queries using knowledge-first approach with enhanced validation
 */
async function handleSimpleQueryWithKnowledgeFirst(
  message: string,
  conversationHistory: any[],
  userId: string | null,
  sessionId: string | null,
  modelSettings: any,
  streaming: boolean,
  supabase: any
): Promise<Response> {
  console.log('📝 Handling simple query with knowledge-first approach');

  let finalResponse = '';

  try {
    // 1. FIRST: Retrieve relevant knowledge with tracking
    const { knowledge: relevantKnowledge, trackingInfo: knowledgeTrackingInfo } = await getRelevantKnowledge(message, userId, supabase);
    console.log('📚 Retrieved knowledge for simple query:', relevantKnowledge?.length || 0, 'items');

    // 2. Fetch available MCPs 
    const { data: mcps, error: mcpError } = await supabase
      .from('mcps')
      .select('*')
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search', 'jira-tools', 'web-scraper']);

    if (mcpError) {
      throw new Error('Failed to fetch available tools');
    }

    const tools = convertMCPsToTools(mcps);
    const systemPrompt = generateSystemPrompt(mcps, relevantKnowledge);

    // 3. Prepare knowledge-aware messages
    const messages = createKnowledgeAwareMessages(
      systemPrompt,
      conversationHistory,
      message,
      relevantKnowledge
    );

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

    finalResponse = extractAndValidateAssistantMessage(data, 'Simple Query Initial Response');
    let toolsUsed: any[] = [];

    // Execute tools if the model chose to use them (log potential overuse)
    if (data?.choices?.[0]?.message?.tool_calls && data.choices[0].message.tool_calls.length > 0) {
      console.log('🛠️ AI chose to use tools despite knowledge being available');
      
      // Log potential tool overuse for debugging
      logToolOveruse(
        message, 
        relevantKnowledge || [], 
        data.choices[0].message.tool_calls.map((tc: any) => tc.function?.name || 'unknown')
      );
      
      const { toolResults, toolsUsed: executedTools } = await executeTools(
        data.choices[0].message.tool_calls,
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
        finalResponse,
        modelSettings,
        supabase
      );
      
      if (synthesizedResponse && synthesizedResponse.trim()) {
        finalResponse = validateAndEnsureContent(synthesizedResponse, 'Simple Query Synthesized Response');
      }
    } else {
      console.log('✅ AI used knowledge base appropriately - no tools needed');
    }

    // Enhanced fallback if we still don't have a valid response
    if (!finalResponse || !finalResponse.trim()) {
      console.warn('⚠️ No valid response after all processing steps, using enhanced fallback');
      finalResponse = createEnhancedFallbackResponse(message, toolsUsed, []);
    }

    // Create comprehensive tools list including knowledge retrieval
    const allToolsUsed = [...toolsUsed];
    
    // Add knowledge retrieval as a tool
    const knowledgeTool = createKnowledgeRetrievalTool(knowledgeTrackingInfo);
    if (knowledgeTool) {
      allToolsUsed.unshift(knowledgeTool); // Add at the beginning to show it was used first
    }

    // FINAL VALIDATION before database storage
    finalResponse = finalDatabaseValidation(finalResponse, 'Simple Query Final Database Validation');

    // Store assistant response in database with comprehensive tool tracking and validation
    if (userId && sessionId) {
      console.log(`[DB_INSERT] Inserting response for simple query - length: ${finalResponse.length}`);
      await supabase.from('agent_conversations').insert({
        user_id: userId,
        session_id: sessionId,
        role: 'assistant',
        content: finalResponse,
        tools_used: allToolsUsed,
        created_at: new Date().toISOString()
      });
      console.log(`[DB_INSERT] Successfully inserted response to database`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: finalResponse,
        learningLoopUsed: false,
        knowledgeUsed: knowledgeTrackingInfo ? [knowledgeTrackingInfo] : [],
        toolsUsed: allToolsUsed.map(t => ({
          name: t.name,
          parameters: t.parameters,
          success: t.success,
          result: t.result
        })),
        sessionId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in handleSimpleQueryWithKnowledgeFirst:', error);
    
    // Emergency fallback response
    finalResponse = `I apologize, but I encountered an error while processing your message "${message}". Please try again or rephrase your question.`;
    finalResponse = finalDatabaseValidation(finalResponse, 'Simple Query Error Fallback');
    
    // Still try to store the fallback response if possible
    if (userId && sessionId) {
      try {
        console.log(`[DB_INSERT] Inserting error fallback response - length: ${finalResponse.length}`);
        await supabase.from('agent_conversations').insert({
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content: finalResponse,
          tools_used: [],
          created_at: new Date().toISOString()
        });
        console.log(`[DB_INSERT] Successfully inserted error fallback to database`);
      } catch (dbError) {
        console.error('❌ Failed to insert error fallback to database:', dbError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true, // Still return success so user sees the message
        message: finalResponse,
        learningLoopUsed: false,
        knowledgeUsed: [],
        toolsUsed: [],
        sessionId,
        error: 'Partial processing completed with fallback response'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
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

    const evaluationMessage = extractAndValidateAssistantMessage(response.data, 'Iteration Evaluation');
    if (evaluationMessage) {
      try {
        const evaluation = JSON.parse(evaluationMessage);
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
    console.log('🧠 Starting synthesis with context:', accumulatedContext.length, 'iterations');
    
    const contextSummary = accumulatedContext.map((ctx, idx) => 
      `Iteration ${ctx.iteration}: ${ctx.response}\nTools used: ${ctx.toolsUsed?.map(t => t.name).join(', ') || 'none'}`
    ).join('\n\n');

    console.log('📝 Context summary prepared, length:', contextSummary.length);

    const synthesisMessages = [
      {
        role: 'system',
        content: `Synthesize a comprehensive final answer based on multiple iterations of research and tool usage.

        Create a coherent, well-structured response that:
        1. Directly answers the original question
        2. Integrates insights from all iterations
        3. Provides clear, actionable information
        4. Maintains a helpful, professional tone

        IMPORTANT: Respond with plain text only, no code blocks or markdown formatting.`
      },
      {
        role: 'user',
        content: `Original question: "${originalMessage}"

        Research iterations:
        ${contextSummary}

        Please provide a comprehensive final answer.`
      }
    ];

    console.log('🤖 Calling AI model for synthesis...');

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
      console.error('❌ Error in synthesis AI call:', response.error);
      return null;
    }

    console.log('📥 Synthesis response received:', response.data ? 'Success' : 'No data');

    const synthesisMessage = extractAndValidateAssistantMessage(response.data, 'Iterative Synthesis');
    
    if (synthesisMessage) {
      console.log('✅ Synthesis successful, content length:', synthesisMessage.length);
      return synthesisMessage;
    } else {
      console.warn('⚠️ No content in synthesis message');
      return null;
    }

  } catch (error) {
    console.error('❌ Error in synthesizeIterativeResults:', error);
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
    console.log('🔧 Synthesizing tool results:', {
      toolCount: toolsUsed.length,
      originalResponseLength: originalResponse?.length || 0
    });
    
    const toolResultsSummary = toolsUsed.map(tool => {
      if (tool.success && tool.result) {
        const resultPreview = typeof tool.result === 'string' 
          ? tool.result.substring(0, 500) + (tool.result.length > 500 ? '...' : '')
          : JSON.stringify(tool.result).substring(0, 500);
        return `${tool.name}: ${resultPreview}`;
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

Give a clear, human-readable answer based on this information. Format the response appropriately for the type of data (lists, structured information, etc.).`
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
    
    const synthesisMessage = extractAndValidateAssistantMessage(synthesisResponse.data, 'Tool Results Synthesis');
    
    console.log('📋 Synthesis result:', synthesisMessage ? `Success (${synthesisMessage.length} chars)` : 'Failed');
    
    return synthesisMessage;
    
  } catch (error) {
    console.error('Error in synthesis:', error);
    return null;
  }
}

/**
 * Handle progressive streaming for enhanced user experience
 */
async function handleProgressiveStreaming(
  message: string,
  conversationHistory: any[],
  userId: string | null,
  sessionId: string | null,
  modelSettings: any,
  supabase: any
): Promise<Response> {
  const encoder = new TextEncoder();
  let streamSteps: any[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      // Stream function to send chunks to client
      const sendStreamChunk = async (step: any) => {
        const chunk = JSON.stringify(step) + '\n';
        controller.enqueue(encoder.encode(chunk));
        streamSteps.push(step);
      };

      try {
        // Use progressive handler
        const result = await handleProgressiveQuery(
          message,
          conversationHistory,
          userId,
          sessionId,
          modelSettings,
          supabase,
          sendStreamChunk
        );

        // Send final result
        const finalChunk = JSON.stringify({
          type: 'final-result',
          success: result.success,
          message: result.message,
          toolsUsed: result.toolsUsed,
          streamSteps: result.streamSteps
        }) + '\n';
        
        controller.enqueue(encoder.encode(finalChunk));

        // Store final response in database
        if (userId && sessionId && result.success) {
          const validatedFinalResponse = validateAndEnsureContent(result.message, 'Progressive Streaming Final Response');
          await supabase.from('agent_conversations').insert({
            user_id: userId,
            session_id: sessionId,
            role: 'assistant',
            content: validatedFinalResponse,
            tools_used: result.toolsUsed,
            created_at: new Date().toISOString()
          });
        }

      } catch (error) {
        console.error('Streaming error:', error);
        const errorChunk = JSON.stringify({
          type: 'error',
          error: error.message
        }) + '\n';
        controller.enqueue(encoder.encode(errorChunk));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked'
    }
  });
}
