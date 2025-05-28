
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { executeTools } from './tool-executor.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt, createKnowledgeAwareMessages } from './system-prompts.ts';
import { extractAssistantMessage } from './response-handler.ts';
import { persistInsightAsKnowledgeNode } from './knowledge-persistence.ts';
import { shouldContinueLoop, MAX_LOOPS } from './loop-evaluator.ts';

/**
 * Unified query handler with visible self-improvement loop capability
 */
export async function handleUnifiedQuery(
  message: string,
  conversationHistory: any[],
  userId: string | null,
  sessionId: string | null,
  modelSettings: any,
  streaming: boolean,
  supabase: any,
  loopIteration: number = 0
): Promise<any> {
  console.log(`🤖 Starting unified query handler (loop ${loopIteration})`);

  let finalResponse = '';
  let allToolsUsed: any[] = [];
  let loopEvaluation = null;

  try {
    // Helper function to check if message already exists in database
    const messageExists = async (content: string, messageType: string, loopIter: number): Promise<boolean> => {
      if (!userId || !sessionId) return false;
      
      try {
        const { data, error } = await supabase
          .from('agent_conversations')
          .select('id')
          .eq('user_id', userId)
          .eq('session_id', sessionId)
          .eq('content', content)
          .eq('message_type', messageType)
          .eq('loop_iteration', loopIter)
          .gte('created_at', new Date(Date.now() - 10000).toISOString()) // Only check last 10 seconds
          .maybeSingle();
        
        return !error && data !== null;
      } catch {
        return false;
      }
    };

    // Helper function to insert message with duplicate prevention
    const insertMessage = async (content: string, messageType: string, additionalData: any = {}): Promise<boolean> => {
      if (!userId || !sessionId) return false;
      
      const exists = await messageExists(content, messageType, loopIteration);
      if (exists) {
        console.log(`Message already exists: ${messageType} (loop ${loopIteration})`);
        return false;
      }
      
      try {
        const { error } = await supabase.from('agent_conversations').insert({
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content,
          message_type: messageType,
          loop_iteration: loopIteration,
          created_at: new Date().toISOString(),
          ...additionalData
        });
        
        if (error) {
          console.error(`Failed to insert message: ${messageType}`, error);
          return false;
        }
        
        console.log(`✅ Inserted message: ${messageType} (loop ${loopIteration})`);
        return true;
      } catch (error) {
        console.error(`Failed to insert message: ${messageType}`, error);
        return false;
      }
    };

    // 1. Store loop start message (only for iterations > 0)
    if (loopIteration > 0) {
      await insertMessage(
        `🔄 Improving response (Loop ${loopIteration})...`,
        'loop-start'
      );
    }

    // 2. Get available tools
    const { data: mcps, error: mcpError } = await supabase
      .from('mcps')
      .select('*')
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search', 'jira-tools', 'web-scraper']);

    if (mcpError) {
      throw new Error('Failed to fetch available tools');
    }

    const tools = convertMCPsToTools(mcps);
    const systemPrompt = generateUnifiedSystemPrompt(mcps, loopIteration);

    // 3. Prepare messages
    const messages = createKnowledgeAwareMessages(
      systemPrompt,
      conversationHistory,
      message
    );

    console.log(`🧠 Calling LLM (loop ${loopIteration})`);

    // 4. LLM call with tool decision-making
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

    // 5. Execute tools if LLM chose to use them
    if (data?.choices?.[0]?.message?.tool_calls && data.choices[0].message.tool_calls.length > 0) {
      console.log(`🛠️ LLM chose to use ${data.choices[0].message.tool_calls.length} tools (loop ${loopIteration})`);
      
      // Store tool execution message
      await insertMessage(
        `🛠️ Using ${data.choices[0].message.tool_calls.length} tool(s) to enhance response...`,
        'tool-executing'
      );
      
      const { toolResults, toolsUsed } = await executeTools(
        data.choices[0].message.tool_calls,
        mcps,
        userId,
        supabase
      );
      
      allToolsUsed = toolsUsed;
      
      // 6. Synthesize tool results
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
        }
      }
    } else {
      console.log(`✅ LLM responded directly without tools (loop ${loopIteration})`);
    }

    // 7. Store current iteration response
    const responseMessageType = loopIteration === 0 ? 'response' : 'loop-enhancement';
    await insertMessage(
      finalResponse,
      responseMessageType,
      { tools_used: allToolsUsed }
    );

    // 8. Self-improvement loop evaluation (only for initial iterations)
    if (loopIteration < MAX_LOOPS && !streaming) {
      console.log(`🔍 Evaluating if response can be improved (loop ${loopIteration})`);
      
      loopEvaluation = await shouldContinueLoop(
        finalResponse,
        allToolsUsed,
        loopIteration,
        message,
        supabase,
        modelSettings
      );

      // 9. Store reflection and continue loop if improvement is suggested
      if (loopEvaluation.shouldContinue) {
        console.log(`🔄 Continuing to loop ${loopIteration + 1}: ${loopEvaluation.reasoning}`);
        
        // Store reflection message
        await insertMessage(
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
          loopIteration + 1
        );
      } else {
        // Store loop completion message
        if (loopIteration > 0) {
          await insertMessage(
            `✅ **Loop Complete**: Enhanced response ready after ${loopIteration + 1} iteration(s)`,
            'loop-complete',
            {
              improvement_reasoning: loopEvaluation.reasoning,
              should_continue_loop: false
            }
          );
        }
      }
    }

    // 10. Persist insights for multi-tool queries
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

    // 11. Validate response
    if (!finalResponse || !finalResponse.trim()) {
      finalResponse = createFallbackResponse(message, allToolsUsed);
    }

    return {
      success: true,
      message: finalResponse,
      unifiedApproach: true,
      toolsUsed: allToolsUsed,
      sessionId,
      loopIteration,
      improvementReasoning: loopEvaluation?.reasoning,
      streamedSteps: true // Flag to indicate steps were streamed
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
          created_at: new Date().toISOString()
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
      error: 'Processed with fallback response'
    };
  }
}

/**
 * Generate unified system prompt with loop-awareness
 */
function generateUnifiedSystemPrompt(mcps: any[], loopIteration: number = 0): string {
  const mcpSummaries = mcps?.map(mcp => ({
    name: mcp.title,
    description: mcp.description,
    parameters: mcp.parameters
  })) || [];
  
  const toolDescriptions = mcpSummaries
    .map(summary => `**${summary.name}**: ${summary.description}`)
    .join('\n');

  const loopGuidance = loopIteration > 0 ? `

**🔄 IMPROVEMENT CONTEXT:**
This is loop iteration ${loopIteration + 1}. You are reflecting on and improving a previous response. Focus on:
- Adding valuable information that was missing
- Using tools that could enhance the answer
- Providing deeper analysis or additional perspectives
- Ensuring comprehensive coverage of the user's request` : `

**🔄 SELF-IMPROVEMENT:**
After completing your response, you may have the opportunity to reflect and improve it further through additional tool usage or refinement.`;

  return `You are an intelligent AI assistant with access to powerful tools when needed.

**🧠 NATURAL RESPONSE STRATEGY:**
1. **ANSWER DIRECTLY** from your knowledge for simple questions, greetings, and general conversations
2. **USE TOOLS SELECTIVELY** only when they add clear value:
   - Knowledge Search: When you need to access previous learnings or uploaded documents
   - Web Search: For current/real-time information not in your knowledge
   - GitHub Tools: For code repository analysis
   - Other tools: When specific external data is needed

**🛠️ Available Tools (use only when valuable):**
${toolDescriptions}${loopGuidance}

**💡 Decision Guidelines:**
- Simple greetings like "hello" → respond directly
- Basic questions you can answer → respond directly  
- Need previous knowledge → use Knowledge Search tool
- Need current information → use Web Search tool
- Complex research → use multiple tools progressively
- **Don't overuse tools** - your general knowledge is extensive

**📋 Response Style:**
- Be conversational and helpful
- Only use tools when they genuinely improve your answer
- Integrate tool results naturally when used
- Provide clear, actionable information

Remember: You have comprehensive knowledge. Tools are available when needed, not required for every response.`;
}

/**
 * Synthesize results from tools and knowledge
 */
async function synthesizeResults(
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
        content: `Provide a comprehensive, well-structured answer based on the tool results.

User asked: "${originalMessage}"

Tool results:
${toolResultsSummary}

Create a clear, helpful response that integrates this information naturally. Format appropriately for readability.`
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
      console.error('Synthesis failed:', synthesisResponse.error);
      return null;
    }
    
    return extractAssistantMessage(synthesisResponse.data);
    
  } catch (error) {
    console.error('Error in synthesis:', error);
    return null;
  }
}

function createFallbackResponse(message: string, toolsUsed: any[]): string {
  if (toolsUsed && toolsUsed.length > 0) {
    const successfulTools = toolsUsed.filter(t => t.success);
    if (successfulTools.length > 0) {
      return `I processed your request "${message}" using ${successfulTools.length} tool(s), but encountered an issue formatting the response. The tools executed successfully, but I need to try again to provide a proper answer.`;
    }
  }
  
  return `I received your message "${message}" and attempted to process it, but encountered technical difficulties. Please try rephrasing your question or try again in a moment.`;
}
