import { serve as supabaseServe } from 'std/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { cors } from '../_shared/cors.ts';
import { generateSystemPrompt, createKnowledgeAwareMessages } from './system-prompts.ts';
import { analyzeComplexity } from './complexity-analysis.ts';
import { persistInsightAsKnowledgeNode } from './knowledge-persistence.ts';
import { extractAssistantMessage, generateSelfReflection } from './response-handler.ts';
import { createMCPSummary, formatMCPForPrompt } from './mcp-summary.ts';
import { executeTool } from './tool-execution.ts';
import { 
  synthesizeIterativeResultsEnhanced, 
  synthesizeToolResultsEnhanced 
} from './enhanced-synthesis.ts';
import { 
  generateEnhancedSystemPrompt, 
  createIntentAwareMessages 
} from './system-prompts-enhanced.ts';

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const githubToken = Deno.env.get('GITHUB_TOKEN');

// Initialize Supabase client
const supabase = createClient(supabaseUrl!, supabaseKey!);

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: openAIApiKey });

/**
 * Tool Synthesis for Complex Queries
 */
export async function synthesizeIterativeResults(
  originalMessage: string,
  finalResponse: string,
  accumulatedContext: any[],
  supabase: any
): Promise<string> {
  try {
    console.log('🧠 Synthesizing tool results for complex query:', {
      toolCount: accumulatedContext.flatMap(ctx => ctx.toolsUsed || []).length,
      iterations: accumulatedContext.length
    });

    // Use enhanced synthesis with intent analysis
    const enhancedResponse = await synthesizeIterativeResultsEnhanced(
      originalMessage,
      accumulatedContext,
      finalResponse,
      supabase
    );

    return enhancedResponse;
  } catch (error) {
    console.error('Error in synthesis:', error);
    return finalResponse; // Fallback to original response
  }
}

/**
 * Main function to handle requests
 */
const serve = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Setup CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl!, supabaseKey!);

  try {
    const {
      message,
      conversationHistory = [],
      userId,
      sessionId,
      streaming = false,
      modelSettings,
      toolExecution
    } = await req.json();

    // Validate request data
    if (!message || !userId || !sessionId) {
      console.error('Missing required parameters');
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch available tools (MCPs)
    const { data: mcps, error: mcpsError } = await supabase
      .from('managed_copilot_tools')
      .select('*');

    if (mcpsError) {
      console.error('Error fetching MCPs:', mcpsError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch available tools'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch relevant knowledge
    const { data: relevantKnowledge, error: knowledgeError } = await supabase
      .from('knowledge_chunks')
      .select('*')
      .ilike('content', `%${message}%`)
      .limit(3);

    if (knowledgeError) {
      console.error('Error fetching relevant knowledge:', knowledgeError);
    }

    // Enhanced system prompt generation
    const systemPrompt = generateEnhancedSystemPrompt(mcps, relevantKnowledge);

    // Analyze query complexity
    const complexityDecision = await analyzeComplexity(message, systemPrompt, supabase);
    console.log('Complexity analysis:', complexityDecision);

    // Tool execution handling
    if (toolExecution) {
      try {
        const toolResult = await executeTool(toolExecution, openAIApiKey, githubToken);

        return new Response(JSON.stringify({
          success: true,
          message: toolResult,
          toolExecutionResult: toolResult
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (toolError) {
        console.error('Tool execution error:', toolError);
        return new Response(JSON.stringify({
          success: false,
          error: `Tool execution failed: ${toolError.message}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (complexityDecision.complexity === 'complex') {
      // Complex query handling
      console.log('Handling complex query with tool orchestration');

      // Initialize accumulated context
      let accumulatedContext: any[] = [];
      let finalResponse = '';
      let toolsUsed: any[] = [];
      let toolProgress: any[] = [];

      // Iterative tool execution loop
      for (let iteration = 0; iteration < 3; iteration++) {
        console.log(`Starting iteration ${iteration + 1}`);

        // Create messages array with intent preservation
        const messages = createIntentAwareMessages(
          systemPrompt,
          conversationHistory,
          message,
          relevantKnowledge
        );

        // Call AI model proxy
        const aiResponse = await supabase.functions.invoke('ai-model-proxy', {
          body: {
            messages,
            temperature: 0.5,
            max_tokens: 800,
            stream: false
          }
        });

        if (aiResponse.error) {
          throw new Error(`AI model proxy error: ${aiResponse.error.message}`);
        }

        const assistantMessage = extractAssistantMessage(aiResponse.data);
        if (!assistantMessage) {
          throw new Error('No assistant message received from AI model');
        }

        // Tool call handling
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          console.log(`Iteration ${iteration + 1}: Tool calls detected`);

          const iterationToolsUsed: any[] = [];

          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const parameters = JSON.parse(toolCall.function.arguments);

            // Execute tool
            const toolStart = {
              id: toolCall.id,
              name: toolName,
              status: 'starting',
              startTime: new Date().toISOString()
            };
            toolProgress.push(toolStart);

            try {
              const toolResult = await executeTool({ tool: toolName, parameters }, openAIApiKey, githubToken);

              const toolEnd = {
                id: toolCall.id,
                name: toolName,
                status: 'completed',
                result: toolResult,
                endTime: new Date().toISOString(),
                success: true
              };
              toolProgress.push(toolEnd);
              iterationToolsUsed.push(toolEnd);

            } catch (toolError) {
              console.error(`Tool ${toolName} execution failed:`, toolError);

              const toolFail = {
                id: toolCall.id,
                name: toolName,
                status: 'failed',
                error: toolError.message,
                endTime: new Date().toISOString(),
                success: false
              };
              toolProgress.push(toolFail);
              iterationToolsUsed.push(toolFail);
            }
          }

          toolsUsed = [...toolsUsed, ...iterationToolsUsed];

          // Accumulate context
          accumulatedContext.push({
            iteration: iteration + 1,
            response: assistantMessage.content,
            toolsUsed: iterationToolsUsed
          });

        } else {
          console.log(`Iteration ${iteration + 1}: No tool calls, using direct response`);
          finalResponse = assistantMessage.content;
          break;
        }
      }

      // Use enhanced synthesis for final result
      const synthesizedResponse = await synthesizeIterativeResultsEnhanced(
        message,
        accumulatedContext[accumulatedContext.length - 1]?.response || '',
        accumulatedContext,
        supabase
      );

      // Generate self-reflection summary
      const selfReflection = generateSelfReflection(toolsUsed, toolProgress);

      // Persist insight as knowledge node
      const persistenceResult = await persistInsightAsKnowledgeNode(
        message,
        synthesizedResponse,
        accumulatedContext,
        userId,
        complexityDecision,
        supabase
      );

      // Construct final response
      return new Response(JSON.stringify({
        success: true,
        message: synthesizedResponse,
        toolsUsed,
        aiReasoning: complexityDecision.reasoning,
        selfReflection,
        knowledgePersistence: persistenceResult,
        accumulatedContext
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      // Simple query handling with enhanced prompts
      const messages = createIntentAwareMessages(
        systemPrompt,
        conversationHistory,
        message,
        relevantKnowledge
      );

      // Call AI model proxy
      const aiResponse = await supabase.functions.invoke('ai-model-proxy', {
        body: {
          messages,
          temperature: modelSettings.temperature,
          max_tokens: modelSettings.max_tokens,
          stream: streaming
        }
      });

      if (aiResponse.error) {
        throw new Error(`AI model proxy error: ${aiResponse.error.message}`);
      }

      const assistantMessage = extractAssistantMessage(aiResponse.data);
      if (!assistantMessage) {
        throw new Error('No assistant message received from AI model');
      }

      let toolsUsed: any[] = [];

      // Tool call handling for simple queries
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log('Simple query: Tool calls detected');

        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const parameters = JSON.parse(toolCall.function.arguments);

          try {
            const toolResult = await executeTool({ tool: toolName, parameters }, openAIApiKey, githubToken);
            toolsUsed.push({
              name: toolName,
              result: toolResult,
              success: true
            });
          } catch (toolError) {
            console.error(`Tool ${toolName} execution failed:`, toolError);
            toolsUsed.push({
              name: toolName,
              error: toolError.message,
              success: false
            });
          }
        }
      }

      // If tools were used, apply enhanced synthesis
      if (toolsUsed.length > 0) {
        const synthesizedResponse = await synthesizeToolResultsEnhanced(
          message,
          toolsUsed,
          supabase
        );
        
        return new Response(JSON.stringify({
          success: true,
          message: synthesizedResponse,
          toolsUsed,
          aiReasoning: complexityDecision.reasoning
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Construct final response for non-tool responses
      return new Response(JSON.stringify({
        success: true,
        message: assistantMessage.content,
        aiReasoning: complexityDecision.reasoning
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

supabaseServe(serve);
