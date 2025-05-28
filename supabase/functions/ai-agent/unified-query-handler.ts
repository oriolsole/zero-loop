
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { executeTools } from './tool-executor.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { extractAssistantMessage } from './response-handler.ts';
import { persistInsightAsKnowledgeNode } from './knowledge-persistence.ts';
import { reflectAndDecide, submitFollowUpMessage } from './reflection-handler.ts';

/**
 * Pure atomic loop handler - LLM decides everything
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
  console.log('🧠 Starting pure atomic LLM-driven loop');

  let finalResponse = '';
  let allToolsUsed: any[] = [];
  let assistantMessageId: string | null = null;

  try {
    // 1. Get available tools
    const { data: mcps, error: mcpError } = await supabase
      .from('mcps')
      .select('*')
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search', 'jira-tools', 'web-scraper']);

    if (mcpError) {
      throw new Error('Failed to fetch available tools');
    }

    const tools = convertMCPsToTools(mcps);
    const systemPrompt = generatePureLLMSystemPrompt();

    // 2. Create messages
    const messages = createPureMessages(systemPrompt, conversationHistory, message);

    console.log('🎯 LLM making pure decision for:', message);

    // 3. Single atomic LLM call
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

    // 4. Execute tools if LLM chose them
    if (data?.choices?.[0]?.message?.tool_calls && data.choices[0].message.tool_calls.length > 0) {
      console.log('⚡ LLM chose to use', data.choices[0].message.tool_calls.length, 'tools');
      
      const { toolResults, toolsUsed } = await executeTools(
        data.choices[0].message.tool_calls,
        mcps,
        userId,
        supabase
      );
      
      allToolsUsed = toolsUsed;
      
      // 5. Let LLM naturally incorporate results
      if (toolsUsed.length > 0) {
        console.log('🔄 LLM incorporating tool results naturally');
        
        const toolResultMessage = toolsUsed.map(tool => {
          if (tool.success && tool.result) {
            return `Tool ${tool.name} result: ${typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result)}`;
          }
          return `Tool ${tool.name} failed: ${tool.error || 'Unknown error'}`;
        }).join('\n\n');

        const followUpMessages = [
          ...messages,
          { role: 'assistant', content: finalResponse },
          { role: 'user', content: `Tool results:\n${toolResultMessage}\n\nPlease provide a complete response incorporating these results.` }
        ];

        const followUpResponse = await supabase.functions.invoke('ai-model-proxy', {
          body: {
            messages: followUpMessages,
            temperature: 0.3,
            max_tokens: 1500,
            ...(modelSettings && {
              provider: modelSettings.provider,
              model: modelSettings.selectedModel,
              localModelUrl: modelSettings.localModelUrl
            })
          }
        });
        
        if (!followUpResponse.error) {
          const incorporatedResponse = extractAssistantMessage(followUpResponse.data);
          if (incorporatedResponse && incorporatedResponse.trim()) {
            finalResponse = incorporatedResponse;
          }
        }
      }
    } else {
      console.log('💭 LLM responded directly without tools');
    }

    // 6. Persist insights if valuable
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
      finalResponse = createFallbackResponse(message, allToolsUsed);
    }

    // 8. Store result
    if (userId && sessionId) {
      const { data: messageData, error: insertError } = await supabase
        .from('agent_conversations')
        .insert({
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content: finalResponse,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (!insertError && messageData) {
        assistantMessageId = messageData.id;
      }
    }

    // 9. 🧠 PURE LLM REFLECTION - Let LLM decide if it should continue
    console.log('🤔 Starting pure LLM reflection');
    const reflectionDecision = await reflectAndDecide(
      message,
      finalResponse,
      allToolsUsed,
      modelSettings,
      supabase
    );

    if (reflectionDecision.continue && reflectionDecision.nextAction && assistantMessageId) {
      console.log('🔄 LLM decided to continue with:', reflectionDecision.nextAction);
      
      await submitFollowUpMessage(
        reflectionDecision.nextAction,
        userId,
        sessionId,
        assistantMessageId,
        reflectionDecision.reasoning || 'LLM autonomous follow-up',
        supabase
      );
    } else {
      console.log('✅ LLM decided the response is complete');
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
    console.error('❌ Pure atomic loop error:', error);
    
    finalResponse = `I encountered an issue processing "${message}". Let me try a different approach.`;
    
    if (userId && sessionId) {
      try {
        await supabase.from('agent_conversations').insert({
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content: finalResponse,
          created_at: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Failed to store fallback:', dbError);
      }
    }

    return {
      success: true,
      message: finalResponse,
      atomicLoop: true,
      toolsUsed: [],
      sessionId,
      error: 'Fallback used'
    };
  }
}

/**
 * Pure LLM-native system prompt
 */
function generatePureLLMSystemPrompt(): string {
  return `You are an autonomous AI assistant. You think step-by-step and decide what to do.

**🧠 PURE REASONING:**
- Answer directly from knowledge when possible
- Use tools when they add clear value
- Think out loud about your process
- Be natural and conversational

**🛠️ AVAILABLE TOOLS:**
- Knowledge Search: Access previous learnings and documents
- Web Search: Get current/real-time information  
- GitHub Tools: Analyze code repositories
- Jira Tools: Access project management data
- Web Scraper: Extract content from web pages

**💭 DECISION PROCESS:**
1. Understand what the user is asking
2. Think: "Do I need external information for this?"
3. If yes: choose the right tool(s)
4. If no: answer from my knowledge
5. Always be helpful and complete

**🎯 COMMUNICATION:**
- Be direct and natural
- Show your thinking process
- Use emojis to indicate actions (🔍 for searching, ✅ for completion)
- Complete your response fully

Remember: You are in control. Make decisions based on what will best help the user.`;
}

/**
 * Create simple message array without complex injection
 */
function createPureMessages(
  systemPrompt: string,
  conversationHistory: any[],
  userMessage: string
): any[] {
  const messages = [
    {
      role: 'system',
      content: systemPrompt
    }
  ];

  // Add conversation history
  if (conversationHistory && Array.isArray(conversationHistory)) {
    conversationHistory.forEach(historyMessage => {
      if (historyMessage && historyMessage.role && historyMessage.content) {
        messages.push({
          role: historyMessage.role,
          content: historyMessage.content
        });
      }
    });
  }

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage || 'Empty message'
  });

  return messages;
}

/**
 * Create fallback response
 */
function createFallbackResponse(message: string, toolsUsed: any[]): string {
  if (toolsUsed && toolsUsed.length > 0) {
    const successfulTools = toolsUsed.filter(t => t.success);
    if (successfulTools.length > 0) {
      return `I processed "${message}" using ${successfulTools.length} tool(s), but need to refine my response. Let me try again.`;
    }
  }
  
  return `I understand you're asking about "${message}". Let me approach this differently.`;
}
