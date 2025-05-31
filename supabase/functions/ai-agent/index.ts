
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

import { detectOrchestrationNeeds } from './orchestration-detector.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tool name mapping for consistency
const TOOL_NAME_MAP: Record<string, string> = {
  'google-search': 'google-search',
  'knowledge-search': 'query-knowledge-base', // Map to actual function name
  'github-tools': 'github-tools',
  'jira-tools': 'jira-tools',
  'web-scraper': 'web-scraper'
};

async function callToolWithTimeout(toolName: string, parameters: any, timeoutMs = 30000) {
  const actualFunctionName = TOOL_NAME_MAP[toolName] || toolName;
  
  console.log(`🔧 Calling tool: ${toolName} -> ${actualFunctionName} with timeout: ${timeoutMs}ms`);
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Tool ${toolName} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  const callPromise = supabase.functions.invoke(actualFunctionName, {
    body: parameters
  });
  
  return Promise.race([callPromise, timeoutPromise]);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      conversationHistory = [], 
      userId, 
      sessionId, 
      streaming = false, 
      modelSettings, 
      testMode = false, 
      loopEnabled = false,
      agentId,
      customSystemPrompt,
      skipOrchestration = false
    } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('🤖 AI Agent request:', { 
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''), 
      historyLength: conversationHistory.length, 
      userId, 
      sessionId,
      streaming,
      modelSettings,
      testMode,
      loopEnabled,
      agentId,
      hasCustomPrompt: !!customSystemPrompt,
      skipOrchestration
    });

    // In test mode, return basic response for validation
    if (testMode) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Test mode: Unified handler would process query "${message}" with agent ${agentId || 'default'}`,
          unifiedApproach: true,
          testMode: true,
          agentId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For skipOrchestration requests, call the unified handler directly
    if (skipOrchestration) {
      console.log('🔄 Calling unified query handler directly');
      
      try {
        const { data: handlerData, error: handlerError } = await supabase.functions.invoke('unified-query-handler', {
          body: {
            message,
            conversationHistory,
            userId,
            sessionId,
            streaming,
            modelSettings,
            loopEnabled,
            agentId,
            customSystemPrompt,
            skipOrchestration: true
          }
        });

        if (handlerError) {
          throw new Error(`Unified handler error: ${handlerError.message}`);
        }

        return new Response(
          JSON.stringify(handlerData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('❌ Unified handler failed:', error);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `I apologize, but I encountered an error while processing your request: ${error.message}. Please try again or rephrase your query.`,
            toolsUsed: [],
            error: error.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('🎯 Starting unified query handler with orchestration detection');
  
    // Detect if we should use orchestration
    const orchestrationContext = detectOrchestrationNeeds(message);
    console.log('🎼 Orchestration detection result:', orchestrationContext);

    // If orchestration is needed, execute the plan directly instead of returning it
    if (orchestrationContext.shouldUseOrchestration && orchestrationContext.suggestedTools.length > 1) {
      console.log('🚀 Executing multi-tool orchestration');
      
      // Execute tools sequentially for better error handling
      const toolResults = [];
      const toolsUsed = [];
      
      for (const tool of orchestrationContext.suggestedTools) {
        try {
          console.log(`🔧 Executing tool: ${tool}`);
          
          // Prepare parameters for each tool
          let toolParameters;
          if (tool === 'knowledge-search' || tool === 'query-knowledge-base') {
            toolParameters = {
              query: message,
              limit: 5,
              includeNodes: true,
              matchThreshold: 0.3,
              useEmbeddings: true
            };
          } else if (tool === 'google-search') {
            toolParameters = {
              query: message,
              limit: 5
            };
          } else {
            toolParameters = { query: message };
          }
          
          // Execute the tool with timeout
          const { data: toolData, error: toolError } = await callToolWithTimeout(tool, toolParameters, 25000);
          
          if (toolError) {
            console.error(`Tool ${tool} error:`, toolError);
            toolsUsed.push({
              name: tool,
              success: false,
              result: { error: toolError.message }
            });
          } else {
            console.log(`✅ Tool ${tool} completed successfully`);
            toolResults.push(toolData);
            toolsUsed.push({
              name: tool,
              success: true,
              result: toolData
            });
          }
        } catch (error) {
          console.error(`Tool ${tool} execution failed:`, error);
          toolsUsed.push({
            name: tool,
            success: false,
            result: { error: error.message }
          });
        }
      }
      
      // Generate a synthesized response based on tool results
      let synthesizedResponse = `I've executed ${orchestrationContext.suggestedTools.length} tools to provide comprehensive information:\n\n`;
      
      toolResults.forEach((result, index) => {
        const toolName = orchestrationContext.suggestedTools[index];
        synthesizedResponse += `**${toolName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}:**\n`;
        
        if (typeof result === 'string') {
          synthesizedResponse += result + '\n\n';
        } else if (result && typeof result === 'object') {
          if (result.results && Array.isArray(result.results)) {
            synthesizedResponse += `Found ${result.results.length} results:\n`;
            result.results.slice(0, 3).forEach((item: any, idx: number) => {
              synthesizedResponse += `${idx + 1}. ${item.title || item.name || 'Result'}\n`;
              if (item.snippet || item.description) {
                synthesizedResponse += `   ${item.snippet || item.description}\n`;
              }
              if (item.link || item.url) {
                synthesizedResponse += `   ${item.link || item.url}\n`;
              }
              synthesizedResponse += '\n';
            });
          } else if (result.data) {
            synthesizedResponse += JSON.stringify(result.data, null, 2) + '\n\n';
          } else {
            synthesizedResponse += JSON.stringify(result, null, 2) + '\n\n';
          }
        }
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          message: synthesizedResponse,
          toolsUsed,
          orchestrationUsed: true,
          toolsExecuted: orchestrationContext.suggestedTools.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For single tool or simple queries, call the unified query handler
    console.log('🔧 Using single-tool execution');
    
    try {
      const { data: handlerData, error: handlerError } = await supabase.functions.invoke('unified-query-handler', {
        body: {
          message,
          conversationHistory,
          userId,
          sessionId,
          streaming,
          modelSettings,
          loopEnabled,
          agentId,
          customSystemPrompt,
          skipOrchestration: true
        }
      });

      if (handlerError) {
        throw new Error(`Unified handler error: ${handlerError.message}`);
      }

      console.log('✅ Query completed successfully for agent:', agentId);
      
      return new Response(
        JSON.stringify(handlerData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('❌ Unified handler failed:', error);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `I apologize, but I encountered an error while processing your request: ${error.message}. Please try again or rephrase your query.`,
          toolsUsed: [],
          error: error.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ AI Agent error:', error);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        toolsUsed: [],
        error: error.message
      }),
      { 
        status: 200, // Changed from 500 to 200 to prevent frontend errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
