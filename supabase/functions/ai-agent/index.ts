
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

// Direct response patterns for non-tool queries
const getDirectResponse = (message: string): string | null => {
  const lowerMessage = message.toLowerCase().trim();
  
  // Basic greetings
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
  if (greetings.some(greeting => lowerMessage === greeting || lowerMessage.startsWith(greeting + ' '))) {
    return "Hello! I'm your AI agent with access to powerful tools. I can help you search the web, access your knowledge base, work with GitHub repositories, and more. What would you like to explore today?";
  }

  // How are you / status queries
  if (lowerMessage.includes('how are you') || lowerMessage === 'what can you do') {
    return "I'm functioning well and ready to assist! I have access to several tools including web search, knowledge base search, GitHub integration, and more. How can I help you today?";
  }

  // Tool availability queries
  if (lowerMessage.includes('what tools') && (lowerMessage.includes('available') || lowerMessage.includes('have'))) {
    return `I have access to these powerful tools:

🔍 **Web Search** - Search the internet for current information
📚 **Knowledge Base** - Search through your uploaded documents and knowledge
🐙 **GitHub Tools** - Access and analyze GitHub repositories
🎫 **Jira Tools** - Manage Jira issues and tickets
🕷️ **Web Scraper** - Extract content from web pages

Just ask me to search for something, analyze a repository, or help with any task that might use these tools!`;
  }

  // Help requests
  if (lowerMessage === 'help' || lowerMessage.includes('what can you help with')) {
    return "I can help you with many tasks! Try asking me to:\n\n• Search for information: \"search for AI developments\"\n• Find in your knowledge: \"search my knowledge for project insights\"\n• Analyze GitHub repos: \"analyze the latest commits in repository\"\n• And much more!\n\nWhat would you like to explore?";
  }

  return null;
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
          message: `Test mode: AI agent processed query "${message}" with agent ${agentId || 'default'}`,
          testMode: true,
          agentId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for direct conversational responses first
    const directResponse = getDirectResponse(message);
    if (directResponse) {
      console.log('💬 Returning direct conversational response');
      return new Response(
        JSON.stringify({
          success: true,
          message: directResponse,
          conversationalResponse: true,
          toolsUsed: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎯 Starting tool-based query processing');
  
    // Detect if we should use orchestration
    const orchestrationContext = detectOrchestrationNeeds(message);
    console.log('🎼 Orchestration detection result:', orchestrationContext);

    // If orchestration is needed, execute the plan directly
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

    // For single tool queries, execute the tool directly
    console.log('🔧 Using single-tool execution');
    
    // Determine which tool to use based on the message
    let toolToUse = null;
    let toolParameters = {};
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('look up')) {
      if (lowerMessage.includes('knowledge') || lowerMessage.includes('my files') || lowerMessage.includes('documents')) {
        toolToUse = 'knowledge-search';
        toolParameters = {
          query: message,
          limit: 5,
          includeNodes: true,
          matchThreshold: 0.3,
          useEmbeddings: true
        };
      } else {
        toolToUse = 'google-search';
        toolParameters = {
          query: message,
          limit: 5
        };
      }
    } else if (lowerMessage.includes('github') || lowerMessage.includes('repository') || lowerMessage.includes('repo')) {
      toolToUse = 'github-tools';
      toolParameters = {
        action: 'search_repositories',
        query: message
      };
    }
    
    // If we identified a tool, execute it
    if (toolToUse) {
      console.log(`🔧 Executing single tool: ${toolToUse}`);
      
      try {
        const { data: toolData, error: toolError } = await callToolWithTimeout(toolToUse, toolParameters, 25000);
        
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
    
    // If no tool was identified and no direct response, provide guidance
    return new Response(
      JSON.stringify({
        success: true,
        message: `I'd be happy to help you with "${message}". I can search the web, access your knowledge base, or work with GitHub repositories. Try being more specific about what you'd like me to search for or which tool you'd like me to use.`,
        toolsUsed: [],
        availableToolsCount: 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
