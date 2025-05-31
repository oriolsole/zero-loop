
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function handleUnifiedQuery(
  message: string,
  conversationHistory: any[],
  userId: string,
  sessionId: string,
  modelSettings: any,
  streaming: boolean,
  supabaseClient: any,
  loopIteration: number,
  loopEnabled: boolean,
  customSystemPrompt?: string,
  agentId?: string
) {
  console.log(`🤖 Starting unified query handler (loop ${loopIteration}, enabled: ${loopEnabled}, agent: ${agentId})`);
  
  try {
    // Determine which tool to use based on the message
    let toolToUse = null;
    let toolParameters = {};
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('look up')) {
      if (lowerMessage.includes('knowledge') || lowerMessage.includes('my files') || lowerMessage.includes('documents')) {
        toolToUse = 'knowledge-search-v2';
        toolParameters = {
          query: message,
          limit: 5,
          includeNodes: true,
          matchThreshold: 0.3,
          useEmbeddings: true
        };
      } else {
        toolToUse = 'web-search';
        toolParameters = {
          query: message,
          numResults: 5
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
      console.log(`🔧 Executing tool: ${toolToUse}`);
      
      const { data: toolData, error: toolError } = await supabase.functions.invoke(toolToUse.replace('_', '-'), {
        body: toolParameters
      });
      
      if (toolError) {
        console.error(`Tool ${toolToUse} error:`, toolError);
        return {
          success: true,
          message: `I tried to search for information but encountered an error: ${toolError.message}. Please try rephrasing your query.`,
          toolsUsed: [{
            name: toolToUse,
            success: false,
            result: { error: toolError.message }
          }],
          availableToolsCount: 1
        };
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
            if (result.url) {
              formattedResponse += `   ${result.url}\n`;
            }
            formattedResponse += '\n';
          });
        } else if (toolData.data) {
          formattedResponse = JSON.stringify(toolData.data, null, 2);
        } else {
          formattedResponse = JSON.stringify(toolData, null, 2);
        }
      }
      
      return {
        success: true,
        message: formattedResponse || 'Search completed successfully.',
        toolsUsed: [{
          name: toolToUse,
          success: true,
          result: toolData
        }],
        availableToolsCount: 1
      };
    }
    
    // If no tool was identified, return a helpful response
    return {
      success: true,
      message: `I understand you're asking about: "${message}". I can help you search the web, search through your knowledge base, or access GitHub repositories. Try asking me to "search for [your topic]" or "find information about [your topic]".`,
      toolsUsed: [],
      availableToolsCount: 0
    };
    
  } catch (error) {
    console.error('❌ Unified query handler error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
      toolsUsed: [],
      availableToolsCount: 0
    };
  }
}
