
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { ToolProgress, ToolResult } from './tool-executor.ts';

/**
 * Forced tool execution for specific scenarios
 */

/**
 * Forces GitHub tool execution when GitHub request is detected but no tools were called
 */
export async function forceGitHubExecution(
  githubInfo: { owner: string; repo: string },
  mcps: any[],
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ finalResponse: string; toolsUsed: ToolResult[]; toolProgress: ToolProgress[]; selfReflection: string }> {
  console.log('GitHub request detected but no tools called - forcing GitHub tools execution');
  
  const githubMcp = mcps?.find(m => m.default_key === 'github-tools');
  const toolProgress: ToolProgress[] = [];
  const toolsUsed: ToolResult[] = [];
  let finalResponse = '';
  let selfReflection = '';
  
  if (githubMcp && githubInfo) {
    console.log('Forcing GitHub tools execution with repository:', githubInfo);
    
    const toolProgressItem: ToolProgress = {
      id: `tool-${Date.now()}-forced-github`,
      name: 'execute_github-tools',
      displayName: 'GitHub Repository Analysis (Forced)',
      status: 'executing',
      startTime: new Date().toISOString(),
      parameters: { action: 'get_repository', owner: githubInfo.owner, repository: githubInfo.repo },
      progress: 50
    };
    toolProgress.push(toolProgressItem);
    
    try {
      console.log('Calling github-tools with repository parameters...');
      
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('github-tools', {
        body: {
          action: 'get_repository',
          owner: githubInfo.owner,
          repository: githubInfo.repo,
          userId: userId
        }
      });
      
      console.log('GitHub tools response:', { success: !!edgeResult, error: edgeError });
      
      if (edgeError) {
        console.error('GitHub tools error details:', edgeError);
        throw new Error(`GitHub tools error: ${edgeError.message}`);
      }
      
      let repoData = null;
      if (edgeResult && edgeResult.success) {
        repoData = edgeResult.data;
      } else if (edgeResult && edgeResult.data) {
        repoData = edgeResult.data;
      }
      
      console.log('Processed GitHub repository data:', !!repoData);
      
      toolProgress[0].status = 'completed';
      toolProgress[0].endTime = new Date().toISOString();
      toolProgress[0].progress = 100;
      toolProgress[0].result = repoData;
      
      toolsUsed.push({
        name: 'execute_github-tools',
        parameters: { action: 'get_repository', owner: githubInfo.owner, repository: githubInfo.repo },
        result: repoData,
        success: true
      });
      
      // Generate response based on repository data
      if (repoData) {
        finalResponse = `I've analyzed the GitHub repository **${githubInfo.owner}/${githubInfo.repo}**:\n\n`;
        
        if (repoData.description) {
          finalResponse += `**Description**: ${repoData.description}\n\n`;
        }
        
        if (repoData.language) {
          finalResponse += `**Primary Language**: ${repoData.language}\n`;
        }
        
        if (repoData.stargazers_count !== undefined) {
          finalResponse += `**Stars**: ${repoData.stargazers_count}\n`;
        }
        
        if (repoData.forks_count !== undefined) {
          finalResponse += `**Forks**: ${repoData.forks_count}\n`;
        }
        
        if (repoData.created_at) {
          finalResponse += `**Created**: ${new Date(repoData.created_at).toLocaleDateString()}\n`;
        }
        
        if (repoData.updated_at) {
          finalResponse += `**Last Updated**: ${new Date(repoData.updated_at).toLocaleDateString()}\n`;
        }
        
        if (repoData.topics && repoData.topics.length > 0) {
          finalResponse += `**Topics**: ${repoData.topics.join(', ')}\n`;
        }
        
        if (repoData.license && repoData.license.name) {
          finalResponse += `**License**: ${repoData.license.name}\n`;
        }
        
        finalResponse += `\nWould you like me to examine specific files, the README, or other aspects of this repository?`;
      } else {
        finalResponse = `I was able to access the GitHub repository **${githubInfo.owner}/${githubInfo.repo}**, but couldn't retrieve detailed information. The repository might be private or there might be an issue with the GitHub API. Please check if the repository exists and is publicly accessible.`;
      }
      
      selfReflection = `Successfully executed GitHub tools for repository analysis. Retrieved repository data: ${!!repoData}`;
      
    } catch (error) {
      console.error('Forced GitHub tool execution failed:', error);
      
      toolProgress[0].status = 'failed';
      toolProgress[0].endTime = new Date().toISOString();
      toolProgress[0].error = error.message;
      
      toolsUsed.push({
        name: 'execute_github-tools',
        parameters: { action: 'get_repository', owner: githubInfo.owner, repository: githubInfo.repo },
        result: { error: error.message },
        success: false
      });
      
      finalResponse = `I tried to analyze the GitHub repository **${githubInfo.owner}/${githubInfo.repo}** but encountered an error: ${error.message}. This could be because:\n\n1. The repository is private or doesn't exist\n2. GitHub API access is not properly configured\n3. Rate limits have been exceeded\n\nPlease check that the repository URL is correct and publicly accessible.`;
      selfReflection = `Forced GitHub tool execution failed: ${error.message}`;
    }
  } else if (!githubMcp) {
    console.error('No GitHub tools MCP found');
    finalResponse = `I understand you want me to examine the GitHub repository, but the GitHub tools are not properly configured. Please ensure your GitHub integration is set up correctly.`;
    selfReflection = 'GitHub request detected but no GitHub tools available';
  } else {
    console.error('GitHub request detected but could not parse repository information');
    finalResponse = `I detected a GitHub repository request, but I couldn't parse the repository information from your message. Please provide a clear GitHub repository URL like "https://github.com/owner/repository".`;
    selfReflection = 'GitHub request detected but repository information could not be parsed';
  }
  
  return { finalResponse, toolsUsed, toolProgress, selfReflection };
}

/**
 * Forces knowledge search execution when search request is detected but no tools were called
 */
export async function forceKnowledgeSearch(
  message: string,
  mcps: any[],
  supabase: ReturnType<typeof createClient>
): Promise<{ finalResponse: string; toolsUsed: ToolResult[]; toolProgress: ToolProgress[]; selfReflection: string }> {
  console.log('Search request detected but no tools called - forcing knowledge search');
  
  const searchMcp = mcps?.find(m => m.default_key === 'knowledge-search-v2');
  const toolProgress: ToolProgress[] = [];
  const toolsUsed: ToolResult[] = [];
  let finalResponse = '';
  let selfReflection = '';
  
  if (searchMcp) {
    console.log('Forcing knowledge base search with query:', message);
    
    const toolProgressItem: ToolProgress = {
      id: `tool-${Date.now()}-forced`,
      name: 'execute_knowledge-search-v2',
      displayName: 'Knowledge Base Search (Forced)',
      status: 'executing',
      startTime: new Date().toISOString(),
      parameters: { query: message, limit: 5 },
      progress: 50
    };
    toolProgress.push(toolProgressItem);
    
    try {
      console.log('Calling knowledge-proxy with direct parameters...');
      
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('knowledge-proxy', {
        body: {
          query: message,
          limit: 5,
          includeNodes: true,
          matchThreshold: 0.5,
          useEmbeddings: true
        }
      });
      
      console.log('Knowledge proxy response:', { success: !!edgeResult, error: edgeError, resultCount: edgeResult?.data?.length || edgeResult?.results?.length || 0 });
      
      if (edgeError) {
        console.error('Knowledge proxy error details:', edgeError);
        throw new Error(`Knowledge search error: ${edgeError.message}`);
      }
      
      // Handle different response formats from knowledge proxy
      let searchResults = [];
      if (edgeResult && edgeResult.success) {
        searchResults = edgeResult.data || edgeResult.results || [];
      } else if (edgeResult && edgeResult.results) {
        searchResults = edgeResult.results;
      } else if (Array.isArray(edgeResult)) {
        searchResults = edgeResult;
      }
      
      console.log('Processed search results:', searchResults.length, 'items');
      
      toolProgress[0].status = 'completed';
      toolProgress[0].endTime = new Date().toISOString();
      toolProgress[0].progress = 100;
      toolProgress[0].result = searchResults;
      
      toolsUsed.push({
        name: 'execute_knowledge-search-v2',
        parameters: { query: message, limit: 5 },
        result: searchResults,
        success: true
      });
      
      // Generate response based on search results
      if (searchResults && searchResults.length > 0) {
        finalResponse = `I searched your knowledge base for "${message}" and found ${searchResults.length} relevant results:\n\n`;
        
        searchResults.slice(0, 3).forEach((result: any, index: number) => {
          finalResponse += `${index + 1}. **${result.title || 'Untitled'}**\n`;
          if (result.snippet || result.content) {
            const content = result.snippet || result.content;
            finalResponse += `   ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}\n\n`;
          }
        });
        
        if (searchResults.length > 3) {
          finalResponse += `...and ${searchResults.length - 3} more results in your knowledge base.`;
        }
      } else {
        finalResponse = `I searched your knowledge base for "${message}" but didn't find any relevant results. You might want to add more information to your knowledge base or try rephrasing your search query.`;
      }
      
      selfReflection = `Forced knowledge base search completed successfully. Found ${searchResults?.length || 0} results.`;
      
    } catch (error) {
      console.error('Forced tool execution failed:', error);
      
      toolProgress[0].status = 'failed';
      toolProgress[0].endTime = new Date().toISOString();
      toolProgress[0].error = error.message;
      
      toolsUsed.push({
        name: 'execute_knowledge-search-v2',
        parameters: { query: message, limit: 5 },
        result: { error: error.message },
        success: false
      });
      
      finalResponse = `I tried to search your knowledge base for "${message}" but encountered an error: ${error.message}. Please check your knowledge base configuration or try a different search query.`;
      selfReflection = `Forced tool execution failed: ${error.message}`;
    }
  } else {
    console.error('No knowledge search MCP found');
    finalResponse = `I understand you're looking for information about "${message}". However, the knowledge search tool is not properly configured. Please ensure your knowledge base and search tools are set up correctly.`;
    selfReflection = 'Search request detected but no working search tools available';
  }
  
  return { finalResponse, toolsUsed, toolProgress, selfReflection };
}
