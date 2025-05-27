
import { createStreamStep, createToolAnnouncement, createStepAnnouncement, createResultTransition, createPartialResult } from './streaming-utils.ts';
import { executeTools } from './tool-executor.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt, createKnowledgeAwareMessages } from './system-prompts.ts';
import { extractAssistantMessage } from './response-handler.ts';
import { getRelevantKnowledge } from './knowledge-retrieval.ts';

/**
 * Enhanced progressive handler for streaming chat experience
 */
export async function handleProgressiveQuery(
  message: string,
  conversationHistory: any[],
  userId: string | null,
  sessionId: string | null,
  modelSettings: any,
  supabase: any,
  sendStreamChunk: (step: any) => Promise<void>
): Promise<{
  success: boolean;
  message: string;
  toolsUsed: any[];
  streamSteps: any[];
}> {
  const streamSteps: any[] = [];
  let allToolsUsed: any[] = [];

  try {
    // Step 1: Announce intention to analyze the request
    const analysisStep = createStepAnnouncement("what you're asking for");
    await sendStreamChunk(analysisStep);
    streamSteps.push(analysisStep);

    // Step 2: Check knowledge base first
    const knowledgeStep = createStepAnnouncement("your existing knowledge base");
    await sendStreamChunk(knowledgeStep);
    streamSteps.push(knowledgeStep);

    const { knowledge: relevantKnowledge } = await getRelevantKnowledge(message, userId, supabase);
    
    if (relevantKnowledge && relevantKnowledge.length > 0) {
      const knowledgeResult = createPartialResult(relevantKnowledge, "relevant knowledge entries");
      await sendStreamChunk(knowledgeResult);
      streamSteps.push(knowledgeResult);
    } else {
      const noKnowledgeStep = createStreamStep('partial-result', "🔍 No directly relevant knowledge found, I'll search for fresh information...");
      await sendStreamChunk(noKnowledgeStep);
      streamSteps.push(noKnowledgeStep);
    }

    // Step 3: Get available tools and prepare AI request
    const { data: mcps } = await supabase
      .from('mcps')
      .select('*')
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search', 'jira-tools', 'web-scraper']);

    const tools = convertMCPsToTools(mcps || []);
    const systemPrompt = generateSystemPrompt(mcps || [], relevantKnowledge);

    // Enhanced system prompt for progressive interaction
    const progressiveSystemPrompt = `${systemPrompt}

**🔄 PROGRESSIVE INTERACTION MODE**

You must think and respond in clear steps. For each action:
1. Announce what you're doing before doing it
2. Execute tools when needed
3. Report what you found immediately
4. Transition naturally to the next step
5. Be conversational and transparent

Available tools: ${tools.map(t => t.function?.name || 'Unknown').join(', ')}

Use natural language like "Let me check...", "Now I'll...", "Based on this, I should..."`;

    const messages = createKnowledgeAwareMessages(
      progressiveSystemPrompt,
      conversationHistory,
      message,
      relevantKnowledge
    );

    // Step 4: Get AI decision on how to proceed
    const planningStep = createStepAnnouncement("the best approach for your request");
    await sendStreamChunk(planningStep);
    streamSteps.push(planningStep);

    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages,
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

    let assistantMessage = extractAssistantMessage(response.data, 'Progressive Query Response');

    // Step 5: Execute tools if the AI chose to use them
    if (response.data?.choices?.[0]?.message?.tool_calls && response.data.choices[0].message.tool_calls.length > 0) {
      const toolCalls = response.data.choices[0].message.tool_calls;
      
      // Announce tool execution plan
      const toolPlanStep = createStreamStep(
        'step-announcement', 
        `I'll use ${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''} to gather comprehensive information...`
      );
      await sendStreamChunk(toolPlanStep);
      streamSteps.push(toolPlanStep);

      // Execute tools with announcements
      for (let i = 0; i < toolCalls.length; i++) {
        const toolCall = toolCalls[i];
        const toolName = toolCall.function?.name || 'unknown';
        const parameters = JSON.parse(toolCall.function?.arguments || '{}');
        
        // Announce specific tool execution
        const toolAnnouncement = createToolAnnouncement(toolName, getToolAction(toolName, parameters));
        await sendStreamChunk(toolAnnouncement);
        streamSteps.push(toolAnnouncement);

        // Execute the single tool
        const { toolResults, toolsUsed } = await executeTools([toolCall], mcps || [], userId, supabase);
        allToolsUsed = [...allToolsUsed, ...toolsUsed];

        // Report tool result
        if (toolsUsed.length > 0 && toolsUsed[0].success && toolsUsed[0].result) {
          const resultStep = createPartialResult(toolsUsed[0].result, `from ${toolName}`);
          await sendStreamChunk(resultStep);
          streamSteps.push(resultStep);

          // Add transition to next tool if there are more
          if (i < toolCalls.length - 1) {
            const transitionStep = createResultTransition(
              "this information",
              `use ${toolCalls[i + 1].function?.name || 'another tool'}`
            );
            await sendStreamChunk(transitionStep);
            streamSteps.push(transitionStep);
          }
        }
      }

      // Step 6: Synthesize results if multiple tools were used
      if (allToolsUsed.length > 1) {
        const synthesisStep = createStepAnnouncement("all the information I've gathered to give you a comprehensive answer");
        await sendStreamChunk(synthesisStep);
        streamSteps.push(synthesisStep);
      }

      // Generate final synthesis
      const synthesisMessages = [
        {
          role: 'system',
          content: `Provide a comprehensive final answer based on the tool results. Be direct and helpful.

Original question: "${message}"

Tool results: ${JSON.stringify(allToolsUsed.map(t => ({
  tool: t.name,
  success: t.success,
  result: t.result
})), null, 2)}

Create a natural, conversational response that directly answers the user's question.`
        },
        {
          role: 'user',
          content: message
        }
      ];

      const synthesisResponse = await supabase.functions.invoke('ai-model-proxy', {
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

      if (!synthesisResponse.error) {
        const synthesizedMessage = extractAssistantMessage(synthesisResponse.data, 'Tool Synthesis');
        if (synthesizedMessage && synthesizedMessage.trim()) {
          assistantMessage = synthesizedMessage;
        }
      }
    }

    return {
      success: true,
      message: assistantMessage,
      toolsUsed: allToolsUsed,
      streamSteps
    };

  } catch (error) {
    console.error('Error in progressive handler:', error);
    
    const errorStep = createStreamStep('partial-result', `❌ I encountered an error: ${error.message}`);
    await sendStreamChunk(errorStep);
    streamSteps.push(errorStep);

    return {
      success: false,
      message: `I apologize, but I encountered an error while processing your request: ${error.message}`,
      toolsUsed: allToolsUsed,
      streamSteps
    };
  }
}

/**
 * Get human-readable action description for tool
 */
function getToolAction(toolName: string, parameters: any): string {
  switch (toolName) {
    case 'execute_web-search':
      return `search for "${parameters.query || 'information'}"`;
    case 'execute_knowledge-search':
      return `search knowledge base for "${parameters.query || 'relevant content'}"`;
    case 'execute_github-tools':
      return parameters.action || 'analyze repository';
    case 'execute_jira-tools':
      return parameters.action || 'query project data';
    case 'execute_web-scraper':
      return `scrape content from ${parameters.url || 'website'}`;
    default:
      return 'execute operation';
  }
}
