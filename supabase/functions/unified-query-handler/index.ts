
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

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
  'knowledge-search': 'query-knowledge-base',
  'github-tools': 'github-tools',
  'jira-tools': 'jira-tools',
  'web-scraper': 'web-scraper'
};

async function callToolWithTimeout(toolName: string, parameters: any, timeoutMs = 25000) {
  const actualFunctionName = TOOL_NAME_MAP[toolName] || toolName;
  console.log(`🔧 Unified handler calling tool: ${toolName} -> ${actualFunctionName}`);
  
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
      skipOrchestration = false,
      toolName, // Specific tool to execute
      toolParameters // Parameters for the tool
    } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('🤖 Unified query handler request:', { 
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
      skipOrchestration,
      toolName,
      hasToolParams: !!toolParameters
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

    // If specific tool and parameters provided, execute directly
    if (toolName && toolParameters) {
      console.log(`🎯 Executing specific tool: ${toolName}`);
      
      try {
        const { data: toolData, error: toolError } = await callToolWithTimeout(toolName, toolParameters);
        
        if (toolError) {
          console.error(`Tool ${toolName} error:`, toolError);
          return new Response(
            JSON.stringify({
              success: true,
              message: `I tried to execute ${toolName} but encountered an error: ${toolError.message}. Please try again.`,
              toolsUsed: [{
                name: toolName,
                success: false,
                result: { error: toolError.message }
              }]
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`✅ Tool ${toolName} completed successfully`);
        
        // Format the response based on the tool results
        let formattedResponse = '';
        if (typeof toolData === 'string') {
          formattedResponse = toolData;
        } else if (toolData && typeof toolData === 'object') {
          if (toolData.results && Array.isArray(toolData.results)) {
            formattedResponse = `Found ${toolData.results.length} results:\n\n`;
            toolData.results.slice(0, 3).forEach((result: any, index: number) => {
              formattedResponse += `${index + 1}. ${result.title || result.name || 'Result'}\n`;
              if (result.snippet || result.description) {
                formattedResponse += `   ${result.snippet || result.description}\n`;
              }
              if (result.link || result.url) {
                formattedResponse += `   ${result.link || result.url}\n`;
              }
              formattedResponse += '\n';
            });
          } else if (toolData.data) {
            formattedResponse = JSON.stringify(toolData.data, null, 2);
          } else {
            formattedResponse = JSON.stringify(toolData, null, 2);
          }
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: formattedResponse || 'Tool execution completed successfully.',
            toolsUsed: [{
              name: toolName,
              success: true,
              result: toolData
            }]
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } catch (error) {
        console.error(`Tool ${toolName} execution failed:`, error);
        return new Response(
          JSON.stringify({
            success: true,
            message: `I encountered an error while executing ${toolName}: ${error.message}. Please try again.`,
            toolsUsed: [{
              name: toolName,
              success: false,
              result: { error: error.message }
            }]
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Legacy fallback: auto-detect tool from message
    console.log('🔍 Auto-detecting tool from message');
    
    // Determine which tool to use based on the message
    let toolToUse = null;
    let autoToolParameters = {};
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('look up')) {
      if (lowerMessage.includes('knowledge') || lowerMessage.includes('my files') || lowerMessage.includes('documents')) {
        toolToUse = 'knowledge-search';
        autoToolParameters = {
          query: message,
          limit: 5,
          includeNodes: true,
          matchThreshold: 0.3,
          useEmbeddings: true
        };
      } else {
        toolToUse = 'google-search';
        autoToolParameters = {
          query: message,
          limit: 5
        };
      }
    } else if (lowerMessage.includes('github') || lowerMessage.includes('repository') || lowerMessage.includes('repo')) {
      toolToUse = 'github-tools';
      autoToolParameters = {
        action: 'search_repositories',
        query: message
      };
    }
    
    // If we identified a tool, execute it
    if (toolToUse) {
      console.log(`🔧 Auto-executing tool: ${toolToUse}`);
      
      try {
        const { data: toolData, error: toolError } = await callToolWithTimeout(toolToUse, autoToolParameters);
        
        if (toolError) {
          console.error(`Tool ${toolToUse} error:`, toolError);
          return new Response(
            JSON.stringify({
              success: true,
              message: `I tried to search for information but encountered an error: ${toolError.message}. Please try rephrasing your query.`,
              toolsUsed: [{
                name: toolToUse,
                success: false,
                result: { error: toolError.message }
              }],
              availableToolsCount: 1
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`✅ Tool ${toolToUse} completed successfully`);
        
        // Format the response based on the tool results
        let formattedResponse = '';
        if (typeof toolData === 'string') {
          formattedResponse = toolData;
        } else if (toolData && typeof toolData === 'object') {
          if (toolData.results && Array.isArray(toolData.results)) {
            formattedResponse = `Found ${toolData.results.length} results:\n\n`;
            toolData.results.slice(0, 3).forEach((result: any, index: number) => {
              formattedResponse += `${index + 1}. ${result.title || result.name || 'Result'}\n`;
              if (result.snippet || result.description) {
                formattedResponse += `   ${result.snippet || result.description}\n`;
              }
              if (result.link || result.url) {
                formattedResponse += `   ${result.link || result.url}\n`;
              }
              formattedResponse += '\n';
            });
          } else if (toolData.data) {
            formattedResponse = JSON.stringify(toolData.data, null, 2);
          } else {
            formattedResponse = JSON.stringify(toolData, null, 2);
          }
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: formattedResponse || 'Search completed successfully.',
            toolsUsed: [{
              name: toolToUse,
              success: true,
              result: toolData
            }],
            availableToolsCount: 1
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } catch (error) {
        console.error(`Tool ${toolToUse} execution failed:`, error);
        return new Response(
          JSON.stringify({
            success: true,
            message: `I encountered an error while searching: ${error.message}. Please try again.`,
            toolsUsed: [{
              name: toolToUse,
              success: false,
              result: { error: error.message }
            }],
            availableToolsCount: 1
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // If no tool was identified, return guidance
    return new Response(
      JSON.stringify({
        success: true,
        message: `I'd be happy to help with "${message}". Try asking me to search for something specific, or let me know which tool you'd like me to use.`,
        toolsUsed: [],
        availableToolsCount: 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unified query handler error:', error);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        toolsUsed: [],
        availableToolsCount: 0,
        error: error.message
      }),
      { 
        status: 200, // Changed from 500 to 200 to prevent frontend errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
