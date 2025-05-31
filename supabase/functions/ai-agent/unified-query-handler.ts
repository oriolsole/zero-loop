
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { OpenAI } from "https://deno.land/x/openai@v4.20.1/mod.ts";

import { executeTools } from './tool-executor.ts';
import { createToolExecutionMessage } from './tool-message.ts';

const systemPrompt = `You are a helpful AI assistant that helps users achieve their goals.
You can use tools to get more information to better answer questions.
Please respond in a friendly, conversational style.`;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ToolMetadata {
  id: string;
  title: string;
  description: string;
  default_key: string;
  endpoint: string;
  parameters: any[];
}

/**
 * Helper function to build messages array for LLM calls
 */
function buildMessages(
  conversationHistory: any[],
  message: string,
  systemPrompt: string
): Message[] {
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: message },
  ];
  return messages;
}

/**
 * Helper function to call the LLM with tools
 */
async function callLLMWithTools(
  messages: Message[],
  mcpTools: any[],
  modelSettings: any,
  supabase: ReturnType<typeof createClient>
): Promise<any> {
  const openAI = new OpenAI({ apiKey: modelSettings.openAiApiKey });

  const tools = mcpTools.map((tool: any) => {
    // Parse parameters if it's a JSON string
    let parameters = tool.parameters;
    if (typeof parameters === 'string') {
      try {
        parameters = JSON.parse(parameters);
      } catch (e) {
        console.error('Failed to parse tool parameters JSON:', e);
        parameters = [];
      }
    }
    
    // Ensure parameters is an array
    if (!Array.isArray(parameters)) {
      console.error('Tool parameters is not an array:', typeof parameters);
      parameters = [];
    }

    return {
      type: 'function',
      function: {
        name: `execute_${tool.default_key}`,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: parameters.reduce((acc: any, param: any) => {
            acc[param.name] = {
              type: param.type,
              description: param.description,
            };
            if (param.enum) {
              acc[param.name].enum = param.enum;
            }
            return acc;
          }, {}),
          required: parameters
            .filter((param: any) => param.required)
            .map((param: any) => param.name),
        },
      },
    };
  });

  const model = modelSettings.selectedModel || 'gpt-3.5-turbo-1106';

  const chatCompletion = await openAI.chat.completions.create({
    messages: messages,
    model: model,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? 'auto' : 'none',
  });

  return chatCompletion.choices[0].message;
}

export async function handleUnifiedQuery(
  message: string,
  conversationHistory: any[],
  userId: string,
  sessionId: string,
  modelSettings: any,
  streaming: boolean,
  supabase: ReturnType<typeof createClient>,
  loopIteration: number = 0,
  loopEnabled: boolean = false,
  customSystemPrompt?: string,
  agentId?: string,
  userAuthToken?: string
): Promise<any> {
  console.log(`🤖 Starting unified query handler (loop ${loopIteration}, enabled: ${loopEnabled}, agent: ${agentId || 'default'})`);
  console.log(`🧠 Custom system prompt received: ${customSystemPrompt ? 'YES' : 'NO'}`);

  try {
    // Fetch available tools for the agent using a simplified approach
    let mcps: ToolMetadata[] = [];
    if (agentId) {
      console.log(`🔧 Fetching tool configurations for agent: ${agentId}`);
      
      // First, get the agent tool configs
      const { data: agentToolConfigs, error: agentConfigError } = await supabase
        .from('agent_tool_configs')
        .select('mcp_id')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (agentConfigError) {
        console.error('❌ Failed to fetch agent tool configs:', agentConfigError);
        throw new Error('Failed to fetch agent tool configs');
      }

      if (agentToolConfigs && agentToolConfigs.length > 0) {
        // Get the MCP IDs from the configs
        const mcpIds = agentToolConfigs.map(config => config.mcp_id);
        
        // Then fetch the actual MCP data
        const { data: mcpsData, error: mcpsError } = await supabase
          .from('mcps')
          .select('*')
          .in('id', mcpIds);

        if (mcpsError) {
          console.error('❌ Failed to fetch MCPs for agent:', mcpsError);
          throw new Error('Failed to fetch MCPs for agent');
        }

        mcps = mcpsData as ToolMetadata[];
      }

      console.log(`🛠️  Loaded ${mcps.length} tools for agent ${agentId}:`, mcps.map(m => m.title).join(', '));
    } else {
      console.log('🔧 No agent ID provided, fetching default tools');
      const { data: mcpsData, error: mcpsError } = await supabase
        .from('mcps')
        .select('*')
        .eq('isDefault', true);

      if (mcpsError) {
        console.error('❌ Failed to fetch default MCPs:', mcpsError);
        throw new Error('Failed to fetch default MCPs');
      }

      mcps = mcpsData as ToolMetadata[];
      console.log(`🛠️  Loaded ${mcps.length} default tools`);
    }

    // Filter out any tools that require auth if the user is not authenticated
    const mcpTools = mcps.filter(mcp => {
      if (mcp.requirestoken) {
        if (!userId) {
          console.warn(`⚠️  Skipping tool ${mcp.title} because it requires authentication and user is not authenticated`);
          return false;
        }
      }
      return true;
    });

    // Apply custom system prompt if provided
    let systemPrompt = customSystemPrompt || `You are a helpful AI assistant that helps users achieve their goals.
You can use tools to get more information to better answer questions.
Please respond in a friendly, conversational style.`;

    // Build messages for LLM
    const messages = buildMessages(conversationHistory, message, systemPrompt);
    
    console.log(`🧠 Calling LLM (loop ${loopIteration}) with ${mcpTools.length} available tools`);
    console.log(`📨 Message count: ${messages.length}, System prompt length: ${systemPrompt.length}`);

    // Call LLM with tools
    const llmResponse = await callLLMWithTools(messages, mcpTools, modelSettings, supabase);
    
    console.log(`🤖 LLM Response: "${llmResponse.content || 'No content'}"`);

    // Handle tool calls if present
    if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
      console.log(`🛠️ LLM chose to use ${llmResponse.tool_calls.length} tools (loop ${loopIteration})`);
      
      // Create tool execution messages
      const toolCallMessageMap = new Map();
      for (const toolCall of llmResponse.tool_calls) {
        const toolName = toolCall.function.name.replace('execute_', '');
        const toolProgressMessage = await createToolExecutionMessage(
          toolCall,
          toolName,
          userId,
          sessionId,
          loopIteration,
          supabase
        );
        
        if (toolProgressMessage) {
          toolCallMessageMap.set(toolCall.id, toolProgressMessage.id);
          console.log(`📝 Mapped tool call ${toolCall.id} to message ${toolProgressMessage.id}`);
        }
      }
      
      // Execute tools with user auth token
      const { toolResults, toolsUsed, toolProgress } = await executeTools(
        llmResponse.tool_calls, 
        mcps, 
        userId, 
        supabase,
        userAuthToken
      );

      // Update tool execution messages with results
      for (const toolResult of toolResults) {
        const messageId = toolCallMessageMap.get(toolResult.tool_call_id);
        if (messageId) {
          const { error } = await supabase
            .from('messages')
            .update({ content: toolResult.content })
            .eq('id', messageId);

          if (error) {
            console.error('❌ Failed to update tool execution message:', error);
          } else {
            console.log(`✅ Updated tool execution message ${messageId} with result`);
          }
        }
      }

      // Construct the final response content
      const content = toolResults.map(toolResult => toolResult.content).join('\n');
      console.log(`💬 Constructed response content: ${content.substring(0, 100)}...`);

      return {
        message: content,
        toolsUsed,
        availableToolsCount: mcpTools.length,
        loopIteration,
        toolProgress
      };
    } else {
      // No tool calls, return the LLM response directly
      console.log('No tool calls, returning LLM response');
      return {
        message: llmResponse.content,
        toolsUsed: [],
        availableToolsCount: mcpTools.length,
        loopIteration
      };
    }

    // Evaluate if loop should be enabled
    if (loopEnabled) {
      console.log(`\n\n🌀 [Loop ${loopIteration}] Evaluating response for improvement...`);
      const reflectionPrompt = `You are evaluating the previous response from an AI assistant to determine if it fully achieved the user's goal.

      Here is the user's original request:
      ${message}

      Here is the AI assistant's response:
      ${llmResponse.content}

      Please provide a brief explanation of why the response was sufficient or what could be improved.
      If the response was sufficient, respond with "COMPLETE".
      If the response could be improved, provide a concise reason for the improvement.`;

      const reflectionMessages = [
        { role: 'system', content: reflectionPrompt }
      ];

      const reflectionResponse = await openAI.chat.completions.create({
        messages: reflectionMessages,
        model: modelSettings.selectedModel || 'gpt-3.5-turbo-1106',
      });

      const improvementReasoning = reflectionResponse.choices[0].message.content;
      console.log(`\n\n💡 [Loop ${loopIteration}] Improvement reasoning: ${improvementReasoning}`);

      if (improvementReasoning === 'COMPLETE') {
        console.log(`\n\n✅ [Loop ${loopIteration}] Loop completed, returning final result`);
        return {
          message: llmResponse.content,
          toolsUsed: [],
          availableToolsCount: mcpTools.length,
          loopIteration,
          messageType: 'loop-complete'
        };
      } else {
        console.log(`\n\n🔄 [Loop ${loopIteration}] Continuing loop with improvement reasoning`);
        return await handleUnifiedQuery(
          message,
          [...conversationHistory, { role: 'assistant', content: llmResponse.content }],
          userId,
          sessionId,
          modelSettings,
          streaming,
          supabase,
          loopIteration + 1,
          loopEnabled,
          customSystemPrompt,
          agentId
        );
      }
    } else {
      console.log('Loop disabled, returning final result');
      return {
        message: llmResponse.content,
        toolsUsed: [],
        availableToolsCount: mcpTools.length,
        loopIteration
      };
    }
  } catch (error) {
    console.error('❌ Unified query handler error:', error);
    throw error;
  }
}
