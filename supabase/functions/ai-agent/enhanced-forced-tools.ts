
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { ToolProgress, ToolResult } from './tool-executor.ts';
import { ToolDecision } from './tool-decision-logger.ts';

/**
 * Enhanced forced tool execution with better detection and visibility
 */

/**
 * Forces tool execution based on tool decision analysis
 */
export async function executeBasedOnDecision(
  decision: ToolDecision,
  message: string,
  githubInfo: { owner: string; repo: string } | null,
  mcps: any[],
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ finalResponse: string; toolsUsed: ToolResult[]; toolProgress: ToolProgress[]; selfReflection: string } | null> {
  
  if (!decision.shouldUseTools) {
    return null;
  }
  
  console.log('FORCING TOOL EXECUTION based on decision analysis');
  console.log('Decision reasoning:', decision.reasoning);
  console.log('Suggested tools:', decision.suggestedTools);
  
  switch (decision.detectedType) {
    case 'github':
      if (githubInfo) {
        return await forceGitHubExecution(githubInfo, mcps, userId, supabase);
      } else {
        return {
          finalResponse: `I detected a GitHub repository request, but I couldn't parse the repository information from your message. Please provide a clear GitHub repository URL like "https://github.com/owner/repository".`,
          toolsUsed: [],
          toolProgress: [],
          selfReflection: 'GitHub request detected but repository information could not be parsed'
        };
      }
      
    case 'knowledge':
      return await forceKnowledgeSearch(message, mcps, supabase);
      
    case 'search':
      // Try knowledge search first, then web search if needed
      if (decision.suggestedTools.includes('execute_knowledge-search-v2')) {
        const knowledgeResult = await forceKnowledgeSearch(message, mcps, supabase);
        
        // If knowledge search didn't find much, also try web search
        if (knowledgeResult.toolsUsed.length === 0 || 
            (knowledgeResult.toolsUsed[0].success && 
             Array.isArray(knowledgeResult.toolsUsed[0].result) && 
             knowledgeResult.toolsUsed[0].result.length === 0)) {
          
          const webResult = await forceWebSearch(message, mcps, supabase);
          return {
            finalResponse: `${knowledgeResult.finalResponse}\n\nI also searched the web for additional information:\n\n${webResult.finalResponse}`,
            toolsUsed: [...knowledgeResult.toolsUsed, ...webResult.toolsUsed],
            toolProgress: [...knowledgeResult.toolProgress, ...webResult.toolProgress],
            selfReflection: `Combined knowledge base and web search: ${knowledgeResult.selfReflection} + ${webResult.selfReflection}`
          };
        }
        
        return knowledgeResult;
      } else {
        return await forceWebSearch(message, mcps, supabase);
      }
      
    default:
      return null;
  }
}

/**
 * Forces web search execution
 */
async function forceWebSearch(
  message: string,
  mcps: any[],
  supabase: ReturnType<typeof createClient>
): Promise<{ finalResponse: string; toolsUsed: ToolResult[]; toolProgress: ToolProgress[]; selfReflection: string }> {
  console.log('Web search request detected but no tools called - forcing web search');
  
  const webSearchMcp = mcps?.find(m => m.default_key === 'web-search');
  const toolProgress: ToolProgress[] = [];
  const toolsUsed: ToolResult[] = [];
  let finalResponse = '';
  let selfReflection = '';
  
  if (webSearchMcp) {
    console.log('Forcing web search with query:', message);
    
    const toolProgressItem: ToolProgress = {
      id: `tool-${Date.now()}-forced-web`,
      name: 'execute_web-search',
      displayName: 'Web Search (Forced)',
      status: 'executing',
      startTime: new Date().toISOString(),
      parameters: { query: message, num_results: 5 },
      progress: 50
    };
    toolProgress.push(toolProgressItem);
    
    try {
      console.log('Calling google-search with query parameters...');
      
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('google-search', {
        body: {
          query: message,
          num_results: 5
        }
      });
      
      console.log('Web search response:', { success: !!edgeResult, error: edgeError, resultCount: edgeResult?.results?.length || 0 });
      
      if (edgeError) {
        console.error('Web search error details:', edgeError);
        throw new Error(`Web search error: ${edgeError.message}`);
      }
      
      let searchResults = [];
      if (edgeResult && edgeResult.results) {
        searchResults = edgeResult.results;
      }
      
      console.log('Processed web search results:', searchResults.length, 'items');
      
      toolProgress[0].status = 'completed';
      toolProgress[0].endTime = new Date().toISOString();
      toolProgress[0].progress = 100;
      toolProgress[0].result = searchResults;
      
      toolsUsed.push({
        name: 'execute_web-search',
        parameters: { query: message, num_results: 5 },
        result: searchResults,
        success: true
      });
      
      // Generate response based on search results
      if (searchResults && searchResults.length > 0) {
        finalResponse = `I searched the web for "${message}" and found ${searchResults.length} relevant results:\n\n`;
        
        searchResults.slice(0, 3).forEach((result: any, index: number) => {
          finalResponse += `${index + 1}. **${result.title || 'Untitled'}**\n`;
          finalResponse += `   ${result.link || ''}\n`;
          if (result.snippet) {
            finalResponse += `   ${result.snippet}\n\n`;
          }
        });
        
        if (searchResults.length > 3) {
          finalResponse += `...and ${searchResults.length - 3} more results found.`;
        }
      } else {
        finalResponse = `I searched the web for "${message}" but didn't find any relevant results. The search service might be temporarily unavailable or your query might need to be rephrased.`;
      }
      
      selfReflection = `Forced web search completed successfully. Found ${searchResults?.length || 0} results.`;
      
    } catch (error) {
      console.error('Forced web search execution failed:', error);
      
      toolProgress[0].status = 'failed';
      toolProgress[0].endTime = new Date().toISOString();
      toolProgress[0].error = error.message;
      
      toolsUsed.push({
        name: 'execute_web-search',
        parameters: { query: message, num_results: 5 },
        result: { error: error.message },
        success: false
      });
      
      finalResponse = `I tried to search the web for "${message}" but encountered an error: ${error.message}. The web search service might be temporarily unavailable.`;
      selfReflection = `Forced web search execution failed: ${error.message}`;
    }
  } else {
    console.error('No web search MCP found');
    finalResponse = `I understand you're looking for information about "${message}". However, the web search tool is not properly configured. Please ensure your search tools are set up correctly.`;
    selfReflection = 'Web search request detected but no working web search tools available';
  }
  
  return { finalResponse, toolsUsed, toolProgress, selfReflection };
}

// Re-export existing functions for backward compatibility
export { forceGitHubExecution, forceKnowledgeSearch } from './forced-tools.ts';
