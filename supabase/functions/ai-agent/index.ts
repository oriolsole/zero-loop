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

/**
 * Extracts GitHub repository information from a URL
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const githubUrlRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/.*)?/i;
  const match = url.match(githubUrlRegex);
  
  if (match) {
    const owner = match[1];
    const repo = match[2].replace(/\.git$/, ''); // Remove .git suffix if present
    return { owner, repo };
  }
  
  return null;
}

/**
 * Detects if the message contains GitHub URLs or GitHub-related requests
 */
function detectGitHubRequest(message: string): { isGitHubRequest: boolean; githubInfo?: { owner: string; repo: string } } {
  const lowerMessage = message.toLowerCase();
  
  // Check for GitHub URLs
  const githubInfo = parseGitHubUrl(message);
  if (githubInfo) {
    return { isGitHubRequest: true, githubInfo };
  }
  
  // Check for GitHub-related keywords
  const githubKeywords = [
    'github',
    'repository',
    'repo',
    'read this repository',
    'examine repository',
    'analyze repository',
    'github.com'
  ];
  
  const isGitHubRequest = githubKeywords.some(keyword => lowerMessage.includes(keyword));
  
  return { isGitHubRequest };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], userId, sessionId, streaming = false, modelSettings } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('AI Agent request:', { 
      message, 
      historyLength: conversationHistory.length, 
      userId, 
      sessionId,
      streaming,
      modelSettings
    });

    // Store conversation in database if userId and sessionId provided
    if (userId && sessionId) {
      await supabase.from('agent_conversations').insert({
        user_id: userId,
        session_id: sessionId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
      });
    }

    // Fetch available MCPs from the database - only include working ones
    const { data: mcps, error: mcpError } = await supabase
      .from('mcps')
      .select('*')
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search-v2']);

    if (mcpError) {
      console.error('Error fetching MCPs:', mcpError);
      throw new Error('Failed to fetch available tools');
    }

    console.log('Available MCPs:', mcps?.map(m => ({ title: m.title, endpoint: m.endpoint, key: m.default_key })));

    // Convert MCPs to OpenAI function definitions
    const tools = mcps?.map(mcp => {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      let parameters;
      try {
        parameters = typeof mcp.parameters === 'string' 
          ? JSON.parse(mcp.parameters) 
          : mcp.parameters || [];
      } catch (e) {
        console.warn('Failed to parse parameters for MCP:', mcp.id);
        parameters = [];
      }

      parameters.forEach((param: any) => {
        properties[param.name] = {
          type: param.type === 'number' ? 'number' : 'string',
          description: param.description || `${param.name} parameter`
        };

        if (param.enum && Array.isArray(param.enum)) {
          properties[param.name].enum = param.enum;
        }

        if (param.required) {
          required.push(param.name);
        }
      });

      return {
        type: 'function',
        function: {
          name: `execute_${mcp.default_key || mcp.id}`,
          description: mcp.description,
          parameters: {
            type: 'object',
            properties,
            required
          }
        }
      };
    }) || [];

    console.log('Generated tools:', tools.map(t => t.function.name));

    // Detect if user is asking for search operations
    const lowerMessage = message.toLowerCase();
    const isSearchRequest = lowerMessage.includes('search') || 
                           lowerMessage.includes('find') || 
                           lowerMessage.includes('look up') ||
                           lowerMessage.includes('information about') ||
                           lowerMessage.includes('tell me about') ||
                           lowerMessage.includes('knowledge base');

    // Detect GitHub requests
    const { isGitHubRequest, githubInfo } = detectGitHubRequest(message);

    console.log('Is search request:', isSearchRequest);
    console.log('Is GitHub request:', isGitHubRequest, githubInfo);

    // Enhanced system prompt with mandatory tool usage for searches and GitHub requests
    let systemPrompt = `You are an advanced AI agent with access to various tools and self-reflection capabilities. You can help users by:

1. **Mandatory Tool Usage**: When users ask for searches, information lookup, or current data, you MUST use the appropriate tools
2. **Self-Reflection**: After using tools, analyze the results and determine if they meet the user's needs
3. **Task Planning**: Break down complex requests into manageable steps
4. **Error Recovery**: If a tool fails, try alternative approaches or explain limitations

**Available tools**: ${mcps?.map(m => `${m.title} - ${m.description}`).join(', ')}

**CRITICAL TOOL EXECUTION RULES**:
- For ANY search request, you MUST use web-search or knowledge-search-v2 tools
- For GitHub-related queries, you MUST use github-tools
- For current information, you MUST use web-search
- For knowledge base queries, you MUST use knowledge-search-v2
- NEVER claim you will search without actually calling the search tools
- Always be specific with tool parameters to get the best results

**Self-Reflection Protocol**:
- After using tools, assess if the results answer the user's question
- If results are incomplete, suggest follow-up actions
- If tools fail, explain what went wrong and offer alternatives
- Always explain your reasoning when choosing tools

**Communication Style**:
- Be conversational and helpful
- Explain what you're doing when using tools
- Provide context for your decisions
- Ask clarifying questions when needed

Remember: You can use multiple tools in sequence and should reflect on their outputs to provide the best possible assistance.`;

    if (isSearchRequest) {
      systemPrompt += '\n\n**IMPORTANT**: The user is asking for search/information. You MUST use the appropriate search tools (web-search or knowledge-search-v2) to fulfill this request. Do not provide generic responses without using tools.';
    }

    if (isGitHubRequest) {
      systemPrompt += '\n\n**IMPORTANT**: The user is asking about GitHub repositories. You MUST use the github-tools to fetch repository information, files, or other GitHub data. Do not provide generic responses without using tools.';
    }

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

    // Use auto tool choice but with strong system prompt enforcement
    const modelRequestBody = {
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2000,
      stream: streaming,
      // Pass model settings if provided
      ...(modelSettings && {
        provider: modelSettings.provider,
        model: modelSettings.selectedModel,
        localModelUrl: modelSettings.localModelUrl
      })
    };

    console.log('Calling AI model proxy with tools:', tools.length, 'tool_choice: auto');

    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: modelRequestBody
    });

    if (response.error) {
      console.error('AI Model Proxy error:', response.error);
      throw new Error(`AI Model Proxy error: ${response.error.message}`);
    }

    const data = response.data;
    console.log('AI Model response received, checking for tool calls...');

    if (streaming) {
      // Handle streaming response
      return new Response(JSON.stringify(data), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Defensive null checking and different response format handling
    let assistantMessage;
    let fallbackUsed = data.fallback_used || false;
    let fallbackReason = data.fallback_reason || '';

    // Check for OpenAI-style response format
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      assistantMessage = data.choices[0].message;
      console.log('Using OpenAI format - Assistant message tool calls:', assistantMessage.tool_calls?.length || 0);
    }
    // Check for NPAW response format with 'result' field
    else if (data.result) {
      assistantMessage = {
        content: data.result,
        role: 'assistant'
      };
      console.log('Using NPAW format - Assistant message (no tool calls available)');
    }
    // Check for other direct response formats
    else if (data.content || data.message) {
      assistantMessage = {
        content: data.content || data.message,
        role: 'assistant'
      };
      console.log('Using direct format - Assistant message (no tool calls available)');
    }
    // Check if data itself is the message
    else if (typeof data === 'string') {
      assistantMessage = {
        content: data,
        role: 'assistant'
      };
      console.log('Using string format - Assistant message (no tool calls available)');
    }
    else {
      console.error('Unexpected response format:', data);
      throw new Error('Invalid response format from AI model');
    }

    if (!assistantMessage || !assistantMessage.content) {
      throw new Error('No valid message content received from AI model');
    }

    let finalResponse = assistantMessage.content;
    let toolsUsed: any[] = [];
    let selfReflection = '';
    let toolProgress: any[] = [];

    // Check if this was a GitHub request but no tools were called - FORCE tool execution
    if (isGitHubRequest && (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0)) {
      console.log('GitHub request detected but no tools called - forcing GitHub tools execution');
      
      const githubMcp = mcps?.find(m => m.default_key === 'github-tools');
      if (githubMcp && githubInfo) {
        console.log('Forcing GitHub tools execution with repository:', githubInfo);
        
        const toolProgressItem = {
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
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          
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
    }
    // Check if this was a search request but no tools were called - FORCE tool execution
    else if (isSearchRequest && (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0)) {
      console.log('Search request detected but no tools called - forcing knowledge search');
      
      // Force a knowledge base search as fallback
      const searchMcp = mcps?.find(m => m.default_key === 'knowledge-search-v2');
      if (searchMcp) {
        console.log('Forcing knowledge base search with query:', message);
        
        const toolProgressItem = {
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
          
          // Fixed: Call knowledge-proxy with direct parameters, not nested
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
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          
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
    }
    // Enhanced tool execution with detailed progress tracking
    else if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log('Processing', assistantMessage.tool_calls.length, 'tool calls');
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        let parameters;
        
        try {
          parameters = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error('Failed to parse tool parameters:', toolCall.function.arguments);
          parameters = {};
        }
        
        console.log('Executing tool:', functionName, 'with parameters:', parameters);
        
        // Enhanced tool progress tracking
        const toolProgressItem = {
          id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: functionName,
          displayName: functionName.replace('execute_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          status: 'starting',
          startTime: new Date().toISOString(),
          parameters,
          progress: 0
        };
        toolProgress.push(toolProgressItem);
        
        // Extract MCP ID from function name
        const mcpKey = functionName.replace('execute_', '');
        const targetMcp = mcps?.find(m => m.default_key === mcpKey || m.id === mcpKey);
        
        if (!targetMcp) {
          console.error('Tool not found:', mcpKey, 'Available tools:', mcps?.map(m => m.default_key));
          const errorResult = { error: `Tool '${mcpKey}' not found or not available`, toolName: functionName };
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(errorResult)
          });
          
          // Update progress with failure
          const progressIndex = toolProgress.findIndex(t => t.name === functionName);
          if (progressIndex !== -1) {
            toolProgress[progressIndex] = {
              ...toolProgress[progressIndex],
              status: 'failed',
              endTime: new Date().toISOString(),
              error: 'Tool not found'
            };
          }
          
          toolsUsed.push({
            name: functionName,
            parameters,
            result: errorResult,
            success: false
          });
          continue;
        }

        try {
          console.log('Using MCP endpoint:', targetMcp.endpoint, 'for tool:', targetMcp.title);
          
          // Update progress to executing
          const progressIndex = toolProgress.findIndex(t => t.name === functionName);
          if (progressIndex !== -1) {
            toolProgress[progressIndex] = {
              ...toolProgress[progressIndex],
              status: 'executing',
              progress: 25
            };
          }
          
          // Prepare parameters based on the tool type
          let toolParameters = { ...parameters };
          
          // Special handling for knowledge-search-v2
          if (mcpKey === 'knowledge-search-v2') {
            // For knowledge proxy, send parameters directly
            toolParameters = {
              query: parameters.query || message,
              limit: parameters.limit || 5,
              includeNodes: parameters.includeNodes !== false,
              matchThreshold: parameters.matchThreshold || 0.5,
              useEmbeddings: parameters.useEmbeddings !== false
            };
          } else {
            // For other tools, add userId if available
            toolParameters.userId = userId;
          }
          
          console.log('Calling edge function:', targetMcp.endpoint, 'with parameters:', toolParameters);
          
          // Simulate progress updates during execution
          if (progressIndex !== -1) {
            toolProgress[progressIndex].progress = 50;
          }
          
          const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(targetMcp.endpoint, {
            body: toolParameters
          });
          
          console.log('Edge function response:', { 
            endpoint: targetMcp.endpoint,
            success: edgeResult?.success, 
            error: edgeError, 
            dataKeys: edgeResult ? Object.keys(edgeResult) : [],
            resultCount: edgeResult?.data?.length || edgeResult?.results?.length || 0
          });
          
          if (edgeError) {
            console.error('Edge function error:', edgeError);
            throw new Error(`Edge function error: ${edgeError.message}`);
          }
          
          let mcpResult = edgeResult;
          
          // Handle different response formats
          let processedResult = mcpResult;
          if (mcpResult && mcpResult.success === false) {
            throw new Error(mcpResult.error || 'Tool execution failed');
          }
          
          if (mcpResult && mcpResult.data) {
            processedResult = mcpResult.data;
          } else if (mcpResult && mcpResult.results) {
            processedResult = mcpResult.results;
          }
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(processedResult)
          });

          // Update progress with completion
          if (progressIndex !== -1) {
            toolProgress[progressIndex] = {
              ...toolProgress[progressIndex],
              status: 'completed',
              endTime: new Date().toISOString(),
              progress: 100,
              result: processedResult
            };
          }

          toolsUsed.push({
            name: functionName,
            parameters,
            result: processedResult,
            success: true
          });

          console.log('Tool execution successful:', functionName);
          
        } catch (error) {
          console.error('Tool execution error:', functionName, error);
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          
          const errorResult = { 
            error: error.message,
            toolName: functionName,
            details: 'Check if required API tokens are configured and valid'
          };
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(errorResult)
          });

          // Update progress with failure
          const progressIndex = toolProgress.findIndex(t => t.name === functionName);
          if (progressIndex !== -1) {
            toolProgress[progressIndex] = {
              ...toolProgress[progressIndex],
              status: 'failed',
              endTime: new Date().toISOString(),
              error: error.message
            };
          }

          toolsUsed.push({
            name: functionName,
            parameters,
            result: errorResult,
            success: false
          });
        }
      }
      
      console.log('Tool execution summary:', {
        total: toolsUsed.length,
        successful: toolsUsed.filter(t => t.success).length,
        failed: toolsUsed.filter(t => !t.success).length
      });
      
      // Make another AI call with the tool results and self-reflection
      const followUpMessages = [
        ...messages,
        assistantMessage,
        ...toolResults,
        {
          role: 'system',
          content: `Now reflect on the tool results. Assess:
1. Did the tools provide useful information for the user's request?
2. Are there any gaps or issues with the results?
3. Should you recommend additional actions or tools?
4. If tools failed, explain what went wrong and suggest alternatives
5. Provide a clear, helpful response based on all available information.

Be transparent about any limitations or failures. If GitHub tools failed, mention that the user should check their GitHub token configuration.`
        }
      ];
      
      const followUpRequestBody = {
        messages: followUpMessages,
        temperature: 0.7,
        max_tokens: 2000,
        // Pass model settings if provided
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel,
          localModelUrl: modelSettings.localModelUrl
        })
      };

      console.log('Making follow-up call with tool results');

      const followUpResponse = await supabase.functions.invoke('ai-model-proxy', {
        body: followUpRequestBody
      });
      
      if (followUpResponse.error) {
        throw new Error(`AI Model Proxy follow-up error: ${followUpResponse.error.message}`);
      }
      
      const followUpData = followUpResponse.data;
      
      // Handle follow-up response with same defensive checking
      if (followUpData.choices && Array.isArray(followUpData.choices) && followUpData.choices.length > 0) {
        finalResponse = followUpData.choices[0].message.content;
      } else if (followUpData.result) {
        finalResponse = followUpData.result;
      } else if (followUpData.content || followUpData.message) {
        finalResponse = followUpData.content || followUpData.message;
      } else if (typeof followUpData === 'string') {
        finalResponse = followUpData;
      } else {
        console.error('Unexpected follow-up response format:', followUpData);
        finalResponse = assistantMessage.content; // Fall back to original response
      }
      
      // Check if fallback was used in follow-up
      if (followUpData.fallback_used) {
        fallbackUsed = true;
        fallbackReason = followUpData.fallback_reason;
      }
      
      // Generate enhanced self-reflection summary
      const successfulTools = toolsUsed.filter(t => t.success).length;
      const failedTools = toolsUsed.filter(t => !t.success).length;
      const totalExecutionTime = toolProgress.reduce((acc, tool) => {
        if (tool.startTime && tool.endTime) {
          const duration = new Date(tool.endTime).getTime() - new Date(tool.startTime).getTime();
          return acc + duration;
        }
        return acc;
      }, 0);
      
      selfReflection = `Used ${toolsUsed.length} tool(s): ${successfulTools} succeeded, ${failedTools} failed. Total execution time: ${Math.round(totalExecutionTime / 1000 * 100) / 100}s`;
      
      if (failedTools > 0) {
        const failedToolNames = toolsUsed.filter(t => !t.success).map(t => t.name).join(', ');
        selfReflection += ` Failed tools: ${failedToolNames}`;
      }

      console.log('Follow-up response completed successfully');
    } else {
      console.log('No tool calls were made by the AI model');
      selfReflection = 'No tools were used for this request';
    }

    // Store assistant response in database
    if (userId && sessionId) {
      await supabase.from('agent_conversations').insert({
        user_id: userId,
        session_id: sessionId,
        role: 'assistant',
        content: finalResponse,
        tools_used: toolsUsed,
        self_reflection: selfReflection,
        created_at: new Date().toISOString()
      });
    }

    console.log('Returning response with', toolsUsed.length, 'tools used');

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
        toolProgress,
        selfReflection,
        sessionId,
        fallbackUsed,
        fallbackReason
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Agent error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
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
