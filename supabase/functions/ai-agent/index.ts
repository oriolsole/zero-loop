
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

import { executeTools } from './tool-executor.ts';
import { convertMCPsToTools } from './mcp-tools.ts';
import { generateSystemPrompt } from './system-prompts.ts';
import { extractAssistantMessage } from './response-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    console.log('AI Agent request:', { 
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
      await supabase.from('agent_conversations').insert({
        user_id: userId,
        session_id: sessionId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
      });
    }

    // In test mode, return simple response for validation
    if (testMode) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Test mode: Received message "${message}"`,
          testMode: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use unified query handler - no complexity detection needed
    return await handleQuery(
      message, 
      conversationHistory, 
      userId, 
      sessionId, 
      modelSettings, 
      streaming, 
      supabase
    );

  } catch (error) {
    console.error('AI Agent error:', error);
    
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
 * Unified query handler - simplified single flow
 */
async function handleQuery(
  message: string,
  conversationHistory: any[],
  userId: string | null,
  sessionId: string | null,
  modelSettings: any,
  streaming: boolean,
  supabase: any
): Promise<Response> {
  console.log('Processing query with unified handler');

  // Fetch available MCPs from the database
  const { data: mcps, error: mcpError } = await supabase
    .from('mcps')
    .select('*')
    .eq('isDefault', true)
    .in('default_key', ['web-search', 'github-tools', 'knowledge-search-v2', 'jira-tools', 'web-scraper']);

  if (mcpError) {
    throw new Error('Failed to fetch available tools');
  }

  const tools = convertMCPsToTools(mcps);
  const systemPrompt = generateSystemPrompt(mcps);

  // Prepare messages for AI model
  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    ...conversationHistory,
    {
      role: 'user',
      content: message
    }
  ];

  const modelRequestBody = {
    messages,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: 'auto', // Let AI decide naturally
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

  const assistantMessage = extractAssistantMessage(data);
  if (!assistantMessage) {
    throw new Error('No valid message content received from AI model');
  }

  let finalResponse = assistantMessage.content;
  let toolsUsed: any[] = [];

  // Execute tools if the model chose to use them
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    console.log(`Executing ${assistantMessage.tool_calls.length} tools`);
    
    const { toolResults, toolsUsed: executedTools } = await executeTools(
      assistantMessage.tool_calls,
      mcps,
      userId,
      supabase
    );
    
    toolsUsed = executedTools;
    
    // Format tool results directly for single tool calls
    if (toolsUsed.length === 1 && toolsUsed[0].success) {
      const toolResult = toolsUsed[0];
      
      // Special formatting for known tool types
      if (toolResult.name === 'execute_jira-tools') {
        finalResponse = formatJiraResponse(toolResult);
      } else if (toolResult.name === 'execute_knowledge-search-v2') {
        finalResponse = formatKnowledgeResponse(toolResult);
      } else if (toolResult.name === 'execute_web-search') {
        finalResponse = formatWebSearchResponse(toolResult);
      } else {
        // Generic formatting for other tools
        finalResponse = formatGenericToolResponse(toolResult);
      }
    }
    // For multiple tools or failed tools, synthesize if needed
    else if (toolsUsed.length > 1 || toolsUsed.some(t => !t.success)) {
      const synthesizedResponse = await synthesizeToolResults(
        message,
        conversationHistory,
        toolsUsed,
        assistantMessage.content,
        modelSettings,
        supabase
      );
      
      if (synthesizedResponse) {
        finalResponse = synthesizedResponse;
      }
    }
  }

  // Store assistant response in database
  if (userId && sessionId) {
    await supabase.from('agent_conversations').insert({
      user_id: userId,
      session_id: sessionId,
      role: 'assistant',
      content: finalResponse,
      tools_used: toolsUsed,
      created_at: new Date().toISOString()
    });
  }

  console.log('Query processed successfully, response length:', finalResponse.length);

  return new Response(
    JSON.stringify({
      success: true,
      message: finalResponse,
      toolsUsed: toolsUsed.map(t => ({
        name: t.name,
        parameters: t.parameters,
        success: t.success,
        result: t.result
      })),
      sessionId
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Format Jira tool responses
 */
function formatJiraResponse(toolResult: any): string {
  try {
    let result = toolResult.result;
    
    // Handle string results that might be JSON
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch (e) {
        return result; // Return as-is if not JSON
      }
    }

    // Format project lists
    if (Array.isArray(result) && result.length > 0 && result[0].key) {
      const projectList = result.map(project => 
        `• **${project.name}** (${project.key}) - ${project.projectTypeKey || 'software'} project`
      ).join('\n');

      return `Here are the Jira projects I found (${result.length} total):\n\n${projectList}\n\nThese projects span various areas including marketing platforms, AI research, customer success tools, and business solutions.`;
    }

    // Format issue lists
    if (result.issues && Array.isArray(result.issues)) {
      if (result.issues.length === 0) {
        return 'No issues found matching your criteria.';
      }
      
      const issueList = result.issues.slice(0, 10).map(issue => 
        `• **${issue.key}**: ${issue.fields?.summary || 'No summary'} (${issue.fields?.status?.name || 'Unknown status'})`
      ).join('\n');

      return `Found ${result.total || result.issues.length} issue(s):\n\n${issueList}${result.total > 10 ? '\n\n...and more' : ''}`;
    }

    // Fallback to generic formatting
    return `Jira query completed: ${JSON.stringify(result, null, 2)}`;
    
  } catch (error) {
    console.error('Error formatting Jira response:', error);
    return `I found your Jira data, but there was an issue formatting the response. Raw data: ${JSON.stringify(toolResult.result)}`;
  }
}

/**
 * Format knowledge search responses
 */
function formatKnowledgeResponse(toolResult: any): string {
  try {
    let result = toolResult.result;
    
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch (e) {
        return result;
      }
    }

    if (result.results && Array.isArray(result.results)) {
      if (result.results.length === 0) {
        return 'No relevant information found in the knowledge base.';
      }

      const resultList = result.results.map(item => 
        `• **${item.title || 'Untitled'}**: ${item.description || item.content || 'No description'}`
      ).join('\n');

      return `Found ${result.results.length} relevant item(s) in the knowledge base:\n\n${resultList}`;
    }

    return `Knowledge search completed: ${JSON.stringify(result, null, 2)}`;
    
  } catch (error) {
    console.error('Error formatting knowledge response:', error);
    return `I found knowledge base results, but there was an issue formatting the response.`;
  }
}

/**
 * Format web search responses
 */
function formatWebSearchResponse(toolResult: any): string {
  try {
    let result = toolResult.result;
    
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch (e) {
        return result;
      }
    }

    if (result.results && Array.isArray(result.results)) {
      if (result.results.length === 0) {
        return 'No web search results found.';
      }

      const resultList = result.results.slice(0, 5).map(item => 
        `• **${item.title}**: ${item.snippet}\n  Source: ${item.link}`
      ).join('\n\n');

      return `Here are the web search results:\n\n${resultList}`;
    }

    return `Web search completed: ${JSON.stringify(result, null, 2)}`;
    
  } catch (error) {
    console.error('Error formatting web search response:', error);
    return `I found web search results, but there was an issue formatting the response.`;
  }
}

/**
 * Format generic tool responses
 */
function formatGenericToolResponse(toolResult: any): string {
  if (typeof toolResult.result === 'string') {
    return toolResult.result;
  }

  if (toolResult.result && typeof toolResult.result === 'object') {
    return `Tool execution completed successfully. Result: ${JSON.stringify(toolResult.result, null, 2)}`;
  }

  return `Tool ${toolResult.name} executed successfully.`;
}

/**
 * Synthesize results from multiple tools (only when needed)
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
    console.log('Synthesizing results from', toolsUsed.length, 'tools');
    
    const toolResultsSummary = toolsUsed.map(tool => {
      if (tool.success && tool.result) {
        return `${tool.name}: ${typeof tool.result === 'string' ? tool.result.substring(0, 500) : JSON.stringify(tool.result).substring(0, 500)}`;
      }
      return `${tool.name}: Failed - ${tool.error || 'Unknown error'}`;
    }).join('\n\n');

    const synthesisMessages = [
      {
        role: 'system',
        content: `Provide a clear, helpful answer based on the tool results. Be concise and focus on what the user asked.

User asked: "${originalMessage}"

Tool results:
${toolResultsSummary}

Synthesize this into a coherent response.`
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
    
    const synthesisMessage = extractAssistantMessage(synthesisResponse.data);
    return synthesisMessage?.content || null;
    
  } catch (error) {
    console.error('Error in synthesis:', error);
    return null;
  }
}
