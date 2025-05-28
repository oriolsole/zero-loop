
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { executeTools } from './tool-executor.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt, createKnowledgeAwareMessages } from './system-prompts.ts';
import { extractAssistantMessage } from './response-handler.ts';
import { persistInsightAsKnowledgeNode } from './knowledge-persistence.ts';
import { reflectAndDecide, submitFollowUpMessage } from './reflection-handler.ts';

/**
 * Pure atomic loop handler with autonomous reflection
 * Each call is atomic: receive → think → decide → execute → reflect → respond → (optionally continue)
 */
export async function handleUnifiedQuery(
  message: string,
  conversationHistory: any[],
  userId: string | null,
  sessionId: string | null,
  modelSettings: any,
  streaming: boolean,
  supabase: any
): Promise<any> {
  console.log('🧠 Starting atomic loop with autonomous reflection');

  let finalResponse = '';
  let allToolsUsed: any[] = [];
  let assistantMessageId: string | null = null;

  try {
    // 1. Get available tools (LLM will decide if/when to use them)
    const { data: mcps, error: mcpError } = await supabase
      .from('mcps')
      .select('*')
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search', 'jira-tools', 'web-scraper']);

    if (mcpError) {
      throw new Error('Failed to fetch available tools');
    }

    const tools = convertMCPsToTools(mcps);
    const systemPrompt = generateAtomicSystemPrompt();

    // 2. Create messages for atomic decision making
    const messages = createKnowledgeAwareMessages(
      systemPrompt,
      conversationHistory,
      message
    );

    console.log('🎯 LLM making atomic decision for:', message);

    // 3. Single atomic LLM call - decides everything
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

    // 4. Execute tools atomically if LLM chose them
    if (data?.choices?.[0]?.message?.tool_calls && data.choices[0].message.tool_calls.length > 0) {
      console.log('⚡ Executing', data.choices[0].message.tool_calls.length, 'atomic tools');
      
      const { toolResults, toolsUsed } = await executeTools(
        data.choices[0].message.tool_calls,
        mcps,
        userId,
        supabase
      );
      
      allToolsUsed = toolsUsed;
      
      // 5. Synthesize atomically if tools were used
      if (toolsUsed.length > 0) {
        console.log('🔄 Atomic synthesis of tool results');
        const synthesizedResponse = await synthesizeAtomically(
          message,
          toolsUsed,
          finalResponse,
          modelSettings,
          supabase
        );
        
        if (synthesizedResponse && synthesizedResponse.trim()) {
          finalResponse = synthesizedResponse;
        }
      }
    } else {
      console.log('💭 LLM responded directly (no tools needed)');
    }

    // 6. Persist insights atomically if valuable
    if (userId && allToolsUsed.length > 0) {
      try {
        await persistInsightAsKnowledgeNode(
          message,
          finalResponse,
          [{ toolsUsed: allToolsUsed, response: finalResponse }],
          userId,
          { classification: 'ATOMIC', reasoning: 'Atomic loop completion' },
          supabase
        );
      } catch (error) {
        console.warn('Failed to persist atomic insight:', error);
      }
    }

    // 7. Ensure response quality
    if (!finalResponse || !finalResponse.trim()) {
      finalResponse = createAtomicFallback(message, allToolsUsed);
    }

    // 8. Store atomic result and get message ID
    if (userId && sessionId) {
      const { data: messageData, error: insertError } = await supabase
        .from('agent_conversations')
        .insert({
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content: finalResponse,
          tools_used: allToolsUsed,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (!insertError && messageData) {
        assistantMessageId = messageData.id;
      }
    }

    // 9. 🧠 AUTONOMOUS REFLECTION - Decide if we should continue
    console.log('🤔 Starting autonomous reflection phase');
    const reflectionDecision = await reflectAndDecide(
      message,
      finalResponse,
      allToolsUsed,
      modelSettings,
      supabase
    );

    if (reflectionDecision.continue && reflectionDecision.nextAction && assistantMessageId) {
      console.log('🔄 Reflection decided to continue with:', reflectionDecision.nextAction);
      
      // Submit autonomous follow-up message
      await submitFollowUpMessage(
        reflectionDecision.nextAction,
        userId,
        sessionId,
        assistantMessageId,
        reflectionDecision.reasoning || 'Autonomous follow-up',
        supabase
      );
    } else {
      console.log('✅ Reflection decided the response is complete');
    }

    return {
      success: true,
      message: finalResponse,
      atomicLoop: true,
      toolsUsed: allToolsUsed,
      sessionId,
      reflectionDecision: reflectionDecision
    };

  } catch (error) {
    console.error('❌ Atomic loop error:', error);
    
    finalResponse = `I encountered an issue processing "${message}". Let me try a different approach.`;
    
    if (userId && sessionId) {
      try {
        await supabase.from('agent_conversations').insert({
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content: finalResponse,
          tools_used: [],
          created_at: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Failed to store atomic fallback:', dbError);
      }
    }

    return {
      success: true,
      message: finalResponse,
      atomicLoop: true,
      toolsUsed: [],
      sessionId,
      error: 'Atomic fallback used'
    };
  }
}

/**
 * Generate system prompt for atomic decision making
 */
function generateAtomicSystemPrompt(): string {
  return `You are an intelligent AI assistant that makes atomic decisions.

**🎯 ATOMIC DECISION PROCESS:**
Each interaction is atomic: receive → think → decide → execute → respond

**💭 DECISION GUIDELINES:**
- Answer directly if you have sufficient knowledge
- Use tools only when they add clear value
- Make one atomic decision per interaction
- Be decisive and efficient

**🛠️ AVAILABLE TOOLS:**
- Knowledge Search: Access previous learnings and documents
- Web Search: Get current/real-time information  
- GitHub Tools: Analyze code repositories
- Jira Tools: Access project management data
- Web Scraper: Extract content from web pages

**⚡ ATOMIC EXECUTION:**
1. Understand the request completely
2. Decide if tools are needed (yes/no)
3. If yes: choose the minimal set of tools needed
4. If no: respond directly from knowledge
5. Execute atomically and synthesize results

**📋 RESPONSE STYLE:**
- Direct and helpful
- Use tools purposefully, not habitually  
- Integrate results naturally
- Complete the atomic loop efficiently

Remember: Each interaction should complete atomically. Think → Decide → Execute → Respond.`;
}

/**
 * Atomic synthesis of tool results
 */
async function synthesizeAtomically(
  originalMessage: string,
  toolsUsed: any[],
  originalResponse: string,
  modelSettings: any,
  supabase: any
): Promise<string | null> {
  try {
    const toolSummary = toolsUsed.map(tool => {
      if (tool.success && tool.result) {
        const preview = typeof tool.result === 'string' 
          ? tool.result.substring(0, 300) + (tool.result.length > 300 ? '...' : '')
          : JSON.stringify(tool.result).substring(0, 300);
        return `${tool.name}: ${preview}`;
      }
      return `${tool.name}: No result`;
    }).join('\n');

    const synthesisMessages = [
      {
        role: 'system',
        content: `Synthesize a complete, helpful response based on the tool results.

Original question: "${originalMessage}"

Tool results:
${toolSummary}

Provide a clear, comprehensive answer that integrates this information naturally.`
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
        max_tokens: 1000,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel,
          localModelUrl: modelSettings.localModelUrl
        })
      }
    });
    
    if (synthesisResponse.error) {
      console.error('Atomic synthesis failed:', synthesisResponse.error);
      return null;
    }
    
    return extractAssistantMessage(synthesisResponse.data);
    
  } catch (error) {
    console.error('Error in atomic synthesis:', error);
    return null;
  }
}

/**
 * Create atomic fallback response
 */
function createAtomicFallback(message: string, toolsUsed: any[]): string {
  if (toolsUsed && toolsUsed.length > 0) {
    const successfulTools = toolsUsed.filter(t => t.success);
    if (successfulTools.length > 0) {
      return `I processed "${message}" using ${successfulTools.length} tool(s) successfully, but need to refine my response. Let me try again.`;
    }
  }
  
  return `I understand you're asking about "${message}". Let me approach this differently.`;
}
