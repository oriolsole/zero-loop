
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { executeTools } from './tool-executor.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt, createKnowledgeAwareMessages } from './system-prompts.ts';
import { extractAssistantMessage } from './response-handler.ts';
import { persistInsightAsKnowledgeNode } from './knowledge-persistence.ts';
import { getRelevantKnowledge } from './knowledge-retrieval.ts';

/**
 * Unified query handler that lets the LLM naturally decide tool usage
 * Based on knowledge-first approach with natural tool progression
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
  console.log('🤖 Starting unified query handler');

  let finalResponse = '';
  let allToolsUsed: any[] = [];

  try {
    // 1. Retrieve relevant knowledge FIRST (knowledge-first approach)
    const { knowledge: relevantKnowledge, trackingInfo: knowledgeTrackingInfo } = await getRelevantKnowledge(message, userId, supabase);
    console.log('📚 Retrieved relevant knowledge:', relevantKnowledge?.length || 0, 'items');

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
    const systemPrompt = generateUnifiedSystemPrompt(mcps, relevantKnowledge);

    // 3. Prepare knowledge-aware messages
    const messages = createKnowledgeAwareMessages(
      systemPrompt,
      conversationHistory,
      message,
      relevantKnowledge
    );

    // 4. Single LLM call with natural tool decision-making
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

    console.log('🧠 Calling LLM with unified approach');

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
      console.log('🛠️ LLM chose to use', data.choices[0].message.tool_calls.length, 'tools');
      
      const { toolResults, toolsUsed } = await executeTools(
        data.choices[0].message.tool_calls,
        mcps,
        userId,
        supabase
      );
      
      allToolsUsed = toolsUsed;
      
      // 6. Synthesize tool results if tools were used
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
      console.log('✅ LLM used knowledge base appropriately - no tools needed');
    }

    // 7. Add knowledge retrieval to tools list for tracking
    if (knowledgeTrackingInfo) {
      const knowledgeTool = {
        name: 'knowledge_retrieval',
        parameters: {
          query: knowledgeTrackingInfo.result?.query || message,
          searchMode: knowledgeTrackingInfo.searchMode || 'semantic',
          resultsCount: knowledgeTrackingInfo.result?.returnedResults || 0
        },
        result: {
          sources: knowledgeTrackingInfo.sources || [],
          searchType: knowledgeTrackingInfo.result?.searchType || 'semantic',
          totalResults: knowledgeTrackingInfo.result?.totalResults || 0,
          returnedResults: knowledgeTrackingInfo.result?.returnedResults || 0
        },
        success: knowledgeTrackingInfo.success
      };
      allToolsUsed.unshift(knowledgeTool);
    }

    // 8. Persist valuable insights if tools were used extensively
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

    // 9. Validate and ensure response quality
    if (!finalResponse || !finalResponse.trim()) {
      finalResponse = createFallbackResponse(message, allToolsUsed);
    }

    // 10. Store response in database
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
      knowledgeUsed: knowledgeTrackingInfo ? [knowledgeTrackingInfo] : [],
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
 * Generate unified system prompt that guides natural tool usage
 */
function generateUnifiedSystemPrompt(mcps: any[], relevantKnowledge?: any[]): string {
  const mcpSummaries = mcps?.map(mcp => ({
    name: mcp.title,
    description: mcp.description,
    parameters: mcp.parameters
  })) || [];
  
  const toolDescriptions = mcpSummaries
    .map(summary => `**${summary.name}**: ${summary.description}`)
    .join('\n');
  
  const knowledgeSection = relevantKnowledge && relevantKnowledge.length > 0 
    ? formatKnowledgeSection(relevantKnowledge)
    : '';

  return `You are an intelligent AI assistant with access to a knowledge base and powerful tools.

${knowledgeSection}

**🧠 UNIFIED RESPONSE STRATEGY:**
1. **ALWAYS** start by checking your knowledge base for relevant information
2. **ANSWER DIRECTLY** if your knowledge base contains sufficient information
3. **USE TOOLS NATURALLY** when you need:
   - Current/real-time information
   - External data not in your knowledge base
   - Multi-step research or analysis
   - Specific data from external sources

**🛠️ Available Tools:**
${toolDescriptions}

**💡 Natural Decision Making:**
- You can use multiple tools progressively if needed
- Build comprehensive answers step by step
- Combine knowledge base information with tool results
- Use your judgment about when tools add value
- Work efficiently - don't overuse tools when knowledge base suffices

**📋 Response Guidelines:**
- Prioritize existing knowledge but enhance with tools when valuable
- Be direct and conversational in your responses
- Integrate tool results naturally into your answers
- Provide actionable, helpful information
- Cite sources when using external data

Remember: You have both comprehensive knowledge and powerful tools. Use them wisely to provide the best possible assistance.`;
}

/**
 * Format knowledge base content for the system prompt
 */
function formatKnowledgeSection(knowledge: any[]): string {
  if (!knowledge || knowledge.length === 0) return '';
  
  const formattedKnowledge = knowledge.map((item, index) => {
    const sourceType = item.sourceType === 'node' ? `Knowledge Node (${item.nodeType || 'insight'})` : 'Document';
    return `**${index + 1}. ${item.title}** (${sourceType})
   ${item.snippet || item.description}
   Source: ${item.source || 'Internal Knowledge Base'}
   Confidence: ${item.confidence || item.relevanceScore || 'High'}`;
  }).join('\n\n');
  
  return `📚 **YOUR KNOWLEDGE BASE CONTAINS:**

${formattedKnowledge}

🔍 **Use this authoritative knowledge as your primary information source.**
`;
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
