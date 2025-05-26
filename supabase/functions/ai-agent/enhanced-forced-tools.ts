
/**
 * Enhanced forced tool execution with context awareness
 */

import { parseGitHubUrl } from './github-utils.ts';

export async function executeBasedOnDecision(
  toolDecision: any,
  message: string,
  githubInfo: any,
  mcps: any[],
  userId: string,
  supabase: any
): Promise<any> {
  console.log('FORCING TOOL EXECUTION based on decision analysis');
  console.log('Decision reasoning:', toolDecision.reasoning);
  console.log('Suggested tools:', toolDecision.suggestedTools);
  
  const toolsUsed: any[] = [];
  let finalResponse = '';
  const toolProgress: any[] = [];

  // Handle GitHub requests with context awareness
  if (toolDecision.detectedType === 'github' || toolDecision.suggestedTools.includes('execute_github-tools')) {
    console.log('GitHub request detected but no tools called - forcing GitHub tools execution');
    
    // Try to get GitHub info from context if not directly provided
    let repoInfo = githubInfo;
    if (!repoInfo && toolDecision.contextualInfo?.githubRepo) {
      repoInfo = toolDecision.contextualInfo.githubRepo;
      console.log('Using GitHub info from conversation context:', repoInfo);
    }
    
    // If still no repo info, try parsing from message
    if (!repoInfo) {
      const parsed = parseGitHubUrl(message);
      if (parsed) {
        repoInfo = parsed;
      }
    }
    
    if (repoInfo) {
      console.log('Forcing GitHub tools execution with repository:', repoInfo);
      
      try {
        const githubMcp = mcps.find(m => m.default_key === 'github-tools');
        if (githubMcp) {
          console.log('Calling github-tools with repository parameters...');
          
          const { data: githubResponse, error: githubError } = await supabase.functions.invoke(githubMcp.endpoint, {
            body: {
              action: 'get_repository',
              owner: repoInfo.owner,
              repository: repoInfo.repo,
              userId: userId
            }
          });

          console.log('GitHub tools response:', { success: !githubError, error: githubError });

          if (!githubError && githubResponse) {
            console.log('Processed GitHub repository data:', !!githubResponse);
            toolsUsed.push({
              name: 'execute_github-tools',
              parameters: { owner: repoInfo.owner, repository: repoInfo.repo },
              success: true,
              result: githubResponse
            });
            
            toolProgress.push({
              name: 'execute_github-tools',
              displayName: 'GitHub Repository Analysis (Forced)',
              status: 'completed',
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString()
            });

            finalResponse = typeof githubResponse === 'string' ? githubResponse : JSON.stringify(githubResponse);
          } else {
            console.error('GitHub tools execution failed:', githubError);
            toolsUsed.push({
              name: 'execute_github-tools',
              parameters: { owner: repoInfo.owner, repository: repoInfo.repo },
              success: false,
              result: `GitHub tools execution failed: ${githubError?.message || 'Unknown error'}`
            });
          }
        }
      } catch (error) {
        console.error('Error forcing GitHub tools execution:', error);
        toolsUsed.push({
          name: 'execute_github-tools',
          parameters: { owner: repoInfo?.owner, repository: repoInfo?.repo },
          success: false,
          result: `Error: ${error.message}`
        });
      }
    } else {
      console.log('No GitHub repository information available for forced execution');
    }
  }
  // Handle search requests
  else if (toolDecision.detectedType === 'search' || toolDecision.suggestedTools.includes('execute_web-search')) {
    console.log('Web search request detected but no tools called - forcing web search');
    
    const searchQuery = extractSearchQuery(message, toolDecision);
    console.log('Forcing web search with query:', searchQuery);
    
    try {
      const webSearchMcp = mcps.find(m => m.default_key === 'web-search');
      if (webSearchMcp) {
        console.log('Calling google-search with query parameters...');
        
        const { data: searchResponse, error: searchError } = await supabase.functions.invoke(webSearchMcp.endpoint, {
          body: {
            query: searchQuery,
            limit: 5
          }
        });

        console.log('Web search response:', { success: !searchError, error: searchError, resultCount: searchResponse?.length });

        if (!searchError && searchResponse) {
          console.log('Processed web search results:', searchResponse.length, 'items');
          toolsUsed.push({
            name: 'execute_web-search',
            parameters: { query: searchQuery },
            success: true,
            result: searchResponse
          });
          
          toolProgress.push({
            name: 'execute_web-search',
            displayName: 'Web Search (Forced)',
            status: 'completed',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString()
          });

          finalResponse = typeof searchResponse === 'string' ? searchResponse : JSON.stringify(searchResponse);
        } else {
          console.error('Web search execution failed:', searchError);
          toolsUsed.push({
            name: 'execute_web-search',
            parameters: { query: searchQuery },
            success: false,
            result: `Web search failed: ${searchError?.message || 'Unknown error'}`
          });
        }
      }
    } catch (error) {
      console.error('Error forcing web search execution:', error);
      toolsUsed.push({
        name: 'execute_web-search',
        parameters: { query: searchQuery },
        success: false,
        result: `Error: ${error.message}`
      });
    }
  }
  // Handle knowledge base requests
  else if (toolDecision.detectedType === 'knowledge' || toolDecision.suggestedTools.includes('execute_knowledge-search-v2')) {
    console.log('Knowledge search request detected but no tools called - forcing knowledge search');
    
    try {
      const knowledgeMcp = mcps.find(m => m.default_key === 'knowledge-search-v2');
      if (knowledgeMcp) {
        console.log('Calling knowledge-search-v2 with query parameters...');
        
        const { data: knowledgeResponse, error: knowledgeError } = await supabase.functions.invoke(knowledgeMcp.endpoint, {
          body: {
            query: message,
            userId: userId
          }
        });

        console.log('Knowledge search response:', { success: !knowledgeError, error: knowledgeError });

        if (!knowledgeError && knowledgeResponse) {
          console.log('Processed knowledge search results');
          toolsUsed.push({
            name: 'execute_knowledge-search-v2',
            parameters: { query: message },
            success: true,
            result: knowledgeResponse
          });
          
          toolProgress.push({
            name: 'execute_knowledge-search-v2',
            displayName: 'Knowledge Search (Forced)',
            status: 'completed',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString()
          });

          finalResponse = typeof knowledgeResponse === 'string' ? knowledgeResponse : JSON.stringify(knowledgeResponse);
        } else {
          console.error('Knowledge search execution failed:', knowledgeError);
          toolsUsed.push({
            name: 'execute_knowledge-search-v2',
            parameters: { query: message },
            success: false,
            result: `Knowledge search failed: ${knowledgeError?.message || 'Unknown error'}`
          });
        }
      }
    } catch (error) {
      console.error('Error forcing knowledge search execution:', error);
      toolsUsed.push({
        name: 'execute_knowledge-search-v2',
        parameters: { query: message },
        success: false,
        result: `Error: ${error.message}`
      });
    }
  }

  if (toolsUsed.length > 0) {
    return {
      toolsUsed,
      finalResponse,
      toolProgress
    };
  }

  return null;
}

/**
 * Extract appropriate search query from message and context
 */
function extractSearchQuery(message: string, toolDecision: any): string {
  // If the message is context-dependent and references GitHub, modify the query
  if (toolDecision.contextualInfo?.referencesGitHub && toolDecision.contextualInfo?.githubRepo) {
    const { owner, repo } = toolDecision.contextualInfo.githubRepo;
    
    // Transform contextual queries into specific searches
    if (/\b(its?|this|that)\s+(file structure|directory structure|structure)\b/i.test(message)) {
      return `${owner}/${repo} repository file structure directory layout`;
    }
    
    if (/\b(its?|this|that)\s+(files|folders|contents?)\b/i.test(message)) {
      return `${owner}/${repo} repository files folders contents`;
    }
  }
  
  // For non-contextual queries, use the message as-is
  return message;
}
