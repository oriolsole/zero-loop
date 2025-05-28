
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { executeTools } from './tool-executor.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt, createKnowledgeAwareMessages } from './system-prompts.ts';
import { extractAssistantMessage } from './response-handler.ts';
import { persistInsightAsKnowledgeNode } from './knowledge-persistence.ts';

/**
 * Unified query handler that lets the LLM naturally decide tool usage
 * Knowledge retrieval is now tool-based only, not forced
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
  console.log('🤖 Starting unified query handler with optional knowledge');

  let finalResponse = '';
  let allToolsUsed: any[] = [];

  try {
    // 1. Get available tools (knowledge search is just one of many available tools)
    const { data: mcps, error: mcpError } = await supabase
      .from('mcps')
      .select('*')
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search', 'jira-tools', 'web-scraper']);

    if (mcpError) {
      throw new Error('Failed to fetch available tools');
    }

    const tools = convertMCPsToTools(mcps);
    const systemPrompt = generateUnifiedSystemPrompt(mcps);

    // 2. Prepare messages WITHOUT any forced knowledge injection
    const messages = createKnowledgeAwareMessages(
      systemPrompt,
      conversationHistory,
      message
      // NO relevantKnowledge parameter - let LLM decide via tools
    );

    console.log('🧠 Calling LLM with natural tool choice (no forced knowledge)');

    // 3. Single LLM call with natural tool decision-making
    const modelRequestBody = {
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: 'auto', // LLM decides which tools to use
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

    // 4. Execute tools ONLY if LLM chose to use them
    if (data?.choices?.[0]?.message?.tool_calls && data.choices[0].message.tool_calls.length > 0) {
      console.log('🛠️ LLM chose to use', data.choices[0].message.tool_calls.length, 'tools');
      
      const { toolResults, toolsUsed } = await executeTools(
        data.choices[0].message.tool_calls,
        mcps,
        userId,
        supabase
      );
      
      allToolsUsed = toolsUsed;
      
      // 5. Synthesize tool results if tools were used
      if (toolsUsed.length > 0) {
        console.log('🔄 Synthesizing tool results');
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
      console.log('✅ LLM responded directly without using any tools');
    }

    // 6. Persist valuable insights if multiple tools were used
    if (userId && allToolsUsed.length > 1) {
      try {
        await persistInsightAsKnowledgeNode(
          message,
          finalResponse,
          [{ toolsUsed: allToolsUsed, response: finalResponse }],
          userId,
          { classification: 'UNIFIED', reasoning: 'Multi-tool unified query processing' },
          supabase
        );
      } catch (error) {
        console.warn('Failed to persist insights:', error);
      }
    }

    // 7. Validate and ensure response quality
    if (!finalResponse || !finalResponse.trim()) {
      finalResponse = createFallbackResponse(message, allToolsUsed);
    }

    // 8. Store response in database
    if (userId && sessionId) {
      await supabase.from('agent_conversations').insert({
        user_id: userId,
        session_id: sessionId,
        role: 'assistant',
        content: finalResponse,
        tools_used: allToolsUsed,
        created_at: new Date().toISOString()
      });
    }

    return {
      success: true,
      message: finalResponse,
      unifiedApproach: true,
      toolsUsed: allToolsUsed,
      sessionId
    };

  } catch (error) {
    console.error('❌ Error in unified query handler:', error);
    
    // Emergency fallback response
    finalResponse = `I apologize, but I encountered an error while processing your message "${message}". Please try again or rephrase your question.`;
    
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
        console.error('Failed to insert error fallback:', dbError);
      }
    }

    return {
      success: true,
      message: finalResponse,
      unifiedApproach: true,
      toolsUsed: [],
      sessionId,
      error: 'Processed with fallback response'
    };
  }
}

/**
 * Generate unified system prompt emphasizing natural tool usage
 */
function generateUnifiedSystemPrompt(mcps: any[]): string {
  const mcpSummaries = mcps?.map(mcp => ({
    name: mcp.title,
    description: mcp.description,
    parameters: mcp.parameters
  })) || [];
  
  const toolDescriptions = mcpSummaries
    .map(summary => `**${summary.name}**: ${summary.description}`)
    .join('\n');

  return `You are an intelligent AI assistant with access to powerful tools when needed.

**🧠 NATURAL RESPONSE STRATEGY:**
1. **ANSWER DIRECTLY** from your knowledge for simple questions, greetings, and general conversations
2. **USE TOOLS SELECTIVELY** only when they add clear value:
   - Knowledge Search: When you need to access previous learnings or uploaded documents
   - Web Search: For current/real-time information not in your knowledge
   - GitHub Tools: For code repository analysis
   - Other tools: When specific external data is needed

**🛠️ Available Tools (use only when valuable):**
${toolDescriptions}

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

/**
 * Create fallback response when main response fails
 */
function createFallbackResponse(message: string, toolsUsed: any[]): string {
  if (toolsUsed && toolsUsed.length > 0) {
    const successfulTools = toolsUsed.filter(t => t.success);
    if (successfulTools.length > 0) {
      return `I processed your request "${message}" using ${successfulTools.length} tool(s), but encountered an issue formatting the response. The tools executed successfully, but I need to try again to provide a proper answer.`;
    }
  }
  
  return `I received your message "${message}" and attempted to process it, but encountered technical difficulties. Please try rephrasing your question or try again in a moment.`;
}
