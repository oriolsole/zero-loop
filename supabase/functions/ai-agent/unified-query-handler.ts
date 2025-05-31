
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt, createKnowledgeAwareMessages } from './system-prompts.ts';
import { extractAssistantMessage } from './response-handler.ts';
import { persistInsightAsKnowledgeNode } from './knowledge-persistence.ts';
import { shouldContinueLoop, MAX_LOOPS } from './loop-evaluator.ts';
import { getAgentEnabledTools, setupDefaultToolsForAgent } from './agent-tool-fetcher.ts';
import { MessageManager } from './message-manager.ts';
import { ToolExecutionManager } from './tool-execution-manager.ts';
import { generateUnifiedSystemPrompt, createFallbackResponse } from './prompt-generator.ts';
import { synthesizeResults } from './synthesis-handler.ts';

/**
 * Unified query handler with user-controlled self-improvement loop capability
 */
export async function handleUnifiedQuery(
  message: string,
  conversationHistory: any[],
  userId: string | null,
  sessionId: string | null,
  modelSettings: any,
  streaming: boolean,
  supabase: any,
  loopIteration: number = 0,
  loopEnabled: boolean = false,
  customSystemPrompt?: string,
  agentId?: string
): Promise<any> {
  console.log(`🤖 Starting unified query handler (loop ${loopIteration}, enabled: ${loopEnabled}, agent: ${agentId})`);
  console.log(`🧠 Custom system prompt received: ${customSystemPrompt ? 'YES' : 'NO'}`);
  if (customSystemPrompt) {
    console.log(`📝 Custom prompt content: "${customSystemPrompt.substring(0, 100)}${customSystemPrompt.length > 100 ? '...' : ''}"`);
  }

  let finalResponse = '';
  let allToolsUsed: any[] = [];
  let loopEvaluation = null;

  // Initialize message manager
  const messageManager = new MessageManager(userId, sessionId, supabase, loopIteration, agentId);

  try {
    // 1. Store loop start message (only for iterations > 0 AND when loops are enabled)
    if (loopIteration > 0 && loopEnabled) {
      await messageManager.insertMessage(
        `🔄 Improving response (Loop ${loopIteration})...`,
        'loop-start'
      );
    }

    // 2. Get agent-specific enabled tools with strict enforcement
    console.log(`🔧 Fetching tools for agent: ${agentId}`);
    
    let mcps: any[] = [];
    try {
      // ONLY setup default tools for completely new agents with zero configurations
      // DO NOT auto-setup tools for existing agents with explicit configurations
      if (agentId && userId) {
        console.log(`🔍 Checking if agent ${agentId} needs initial tool setup`);
        await setupDefaultToolsForAgent(agentId, supabase);
      }
      
      // Fetch enabled tools for this specific agent with strict enforcement
      mcps = await getAgentEnabledTools(agentId, supabase);
      
      console.log(`🛠️ Agent ${agentId} has access to ${mcps.length} tools:`, 
        mcps.map(m => m.title).join(', ') || 'NONE');
        
      // Strict enforcement: If agent has 0 tools, it means user explicitly disabled all tools
      if (mcps.length === 0) {
        console.log('🚫 Agent has NO tools available - respecting user configuration');
        console.log('🔒 This agent will operate without any tool access');
      }
    } catch (toolError) {
      console.error('❌ Failed to fetch agent tools:', toolError);
      mcps = []; // No fallback - respect configuration errors as "no tools"
      console.log('⚠️ Due to error, agent will have NO tool access');
    }

    const tools = convertMCPsToTools(mcps);
    
    // 3. Handle custom system prompt with detailed logging
    let systemPrompt: string;
    
    if (customSystemPrompt && customSystemPrompt.trim()) {
      systemPrompt = customSystemPrompt.trim();
      console.log(`🧠 Using custom system prompt for agent ${agentId}`);
      console.log(`📝 Custom prompt: "${systemPrompt}"`);
    } else {
      systemPrompt = generateUnifiedSystemPrompt(mcps, loopIteration, loopEnabled);
      console.log(`🧠 Using generated system prompt for agent ${agentId}`);
      console.log(`📝 Generated prompt preview: "${systemPrompt.substring(0, 200)}..."`);
    }

    // 4. Prepare messages
    const messages = createKnowledgeAwareMessages(
      systemPrompt,
      conversationHistory,
      message
    );

    console.log(`🧠 Calling LLM (loop ${loopIteration}) with ${tools.length} available tools`);
    console.log(`📨 Message count: ${messages.length}, System prompt length: ${systemPrompt.length}`);

    // 5. LLM call with tool decision-making
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

    if (streaming) {
      return {
        success: true,
        streaming: true,
        data: response.data
      };
    }

    const data = response.data;
    finalResponse = extractAssistantMessage(data) || '';

    console.log(`🤖 LLM Response: "${finalResponse.substring(0, 100)}${finalResponse.length > 100 ? '...' : ''}"`);

    // 6. Execute tools if LLM chose to use them
    if (data?.choices?.[0]?.message?.tool_calls && data.choices[0].message.tool_calls.length > 0) {
      const toolExecutionManager = new ToolExecutionManager(messageManager, mcps);
      
      const { toolResults, toolsUsed } = await toolExecutionManager.executeToolsWithMessageManagement(
        data.choices[0].message.tool_calls,
        userId,
        supabase,
        loopIteration
      );
      
      allToolsUsed = toolsUsed;
      
      // 7. Synthesize tool results BEFORE storing response
      if (toolsUsed.length > 0) {
        console.log(`🔄 Synthesizing tool results (loop ${loopIteration})`);
        const synthesizedResponse = await synthesizeResults(
          message,
          conversationHistory,
          toolsUsed,
          finalResponse,
          modelSettings,
          supabase
        );
        
        if (synthesizedResponse && synthesizedResponse.trim()) {
          finalResponse = synthesizedResponse;
          console.log(`✅ Synthesis complete - updated final response (${finalResponse.length} chars)`);
        }
      }
    } else {
      console.log(`✅ LLM responded directly without tools (loop ${loopIteration})`);
    }

    // 8. Store final response ONLY AFTER all tool execution AND synthesis completes
    const responseMessageType = loopIteration === 0 ? 'response' : 'loop-enhancement';
    console.log(`💾 Storing final response after all processing complete (${finalResponse.length} chars)`);
    await messageManager.insertMessage(
      finalResponse,
      responseMessageType,
      { tools_used: allToolsUsed }
    );

    // 9. Self-improvement loop evaluation (only if loops are enabled)
    if (loopEnabled && loopIteration < MAX_LOOPS && !streaming) {
      console.log(`🔍 Evaluating if response can be improved (loop ${loopIteration})`);
      
      loopEvaluation = await shouldContinueLoop(
        finalResponse,
        allToolsUsed,
        loopIteration,
        message,
        supabase,
        modelSettings
      );

      // 10. Store reflection and continue loop if improvement is suggested
      if (loopEvaluation.shouldContinue) {
        console.log(`🔄 Continuing to loop ${loopIteration + 1}: ${loopEvaluation.reasoning}`);
        
        // Store reflection message
        await messageManager.insertMessage(
          `🔍 **Reflection**: ${loopEvaluation.reasoning}`,
          'loop-reflection',
          {
            improvement_reasoning: loopEvaluation.reasoning,
            should_continue_loop: true
          }
        );

        // Create improvement message and recurse
        const improvementMessage = `Reflecting to improve prior response. Previous iteration: "${finalResponse.substring(0, 100)}..."`;
        
        return await handleUnifiedQuery(
          improvementMessage,
          [...conversationHistory, { role: 'assistant', content: finalResponse }],
          userId,
          sessionId,
          modelSettings,
          streaming,
          supabase,
          loopIteration + 1,
          loopEnabled,
          customSystemPrompt,
          agentId // Pass agentId through recursion
        );
      } else {
        // Store loop completion message
        if (loopIteration > 0) {
          await messageManager.insertMessage(
            `✅ **Loop Complete**: Enhanced response ready after ${loopIteration + 1} iteration(s)`,
            'loop-complete',
            {
              improvement_reasoning: loopEvaluation.reasoning,
              should_continue_loop: false
            }
          );
        }
      }
    } else if (!loopEnabled && loopIteration === 0) {
      console.log(`🚫 Loop evaluation skipped - loops disabled by user`);
    }

    // 11. Persist insights for multi-tool queries
    if (userId && allToolsUsed.length > 1) {
      try {
        await persistInsightAsKnowledgeNode(
          message,
          finalResponse,
          [{ toolsUsed: allToolsUsed, response: finalResponse }],
          userId,
          { classification: 'UNIFIED_LOOP', reasoning: `Loop ${loopIteration} with ${allToolsUsed.length} tools` },
          supabase
        );
      } catch (error) {
        console.warn('Failed to persist insights:', error);
      }
    }

    // 12. Validate response
    if (!finalResponse || !finalResponse.trim()) {
      finalResponse = createFallbackResponse(message, allToolsUsed);
    }

    console.log(`🛠️ Tools available: ${mcps.length}`);
    console.log(`📏 Response length: ${finalResponse.length}`);
    console.log(`✅ Unified query completed successfully for agent: ${agentId}`);

    return {
      success: true,
      message: finalResponse,
      unifiedApproach: true,
      toolsUsed: allToolsUsed,
      sessionId,
      loopIteration,
      improvementReasoning: loopEvaluation?.reasoning,
      streamedSteps: true,
      loopEnabled,
      usedCustomPrompt: customSystemPrompt ? true : false,
      agentId,
      availableToolsCount: mcps.length
    };

  } catch (error) {
    console.error(`❌ Error in unified query handler (loop ${loopIteration}):`, error);
    
    finalResponse = `I apologize, but I encountered an error while processing your message "${message}". Please try again or rephrase your question.`;
    
    if (userId && sessionId) {
      try {
        await supabase.from('agent_conversations').insert({
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content: finalResponse,
          tools_used: [],
          loop_iteration: loopIteration,
          agent_id: agentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Failed to insert error fallback:', dbError);
      }
    }

    return {
      success: true,
      message: finalResponse,
      unifiedApproach: true,
      toolsUsed: [],
      sessionId,
      loopIteration,
      error: 'Processed with fallback response',
      loopEnabled,
      usedCustomPrompt: customSystemPrompt ? true : false,
      agentId,
      availableToolsCount: 0
    };
  }
}
