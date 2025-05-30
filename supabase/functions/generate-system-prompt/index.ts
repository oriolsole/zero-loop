

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create MCP summary for system prompt with agent-specific overrides
 */
function createMCPSummary(mcp: any, toolConfig?: any) {
  // Parse sampleUseCases if it's a JSON string
  let useCases = [];
  try {
    if (typeof mcp.sampleUseCases === 'string') {
      useCases = JSON.parse(mcp.sampleUseCases);
    } else if (Array.isArray(mcp.sampleUseCases)) {
      useCases = mcp.sampleUseCases;
    }
  } catch (error) {
    console.warn('Failed to parse sampleUseCases for MCP:', mcp.title, error);
    useCases = [];
  }

  // Apply agent-specific overrides if available
  const title = toolConfig?.custom_title || mcp.title || 'Unknown Tool';
  const description = toolConfig?.custom_description || mcp.description || 'No description available';
  
  // CRITICAL: Use custom use cases if provided, otherwise fall back to default
  let finalUseCases = useCases;
  if (toolConfig?.custom_use_cases && Array.isArray(toolConfig.custom_use_cases) && toolConfig.custom_use_cases.length > 0) {
    finalUseCases = toolConfig.custom_use_cases;
    console.log(`🎯 Using CUSTOM use cases for tool "${title}":`, finalUseCases);
  } else {
    console.log(`📋 Using default use cases for tool "${title}":`, finalUseCases);
  }

  return {
    name: title,
    description: description,
    category: mcp.category || 'general',
    useCases: Array.isArray(finalUseCases) ? finalUseCases : [],
    priority: toolConfig?.priority_override || mcp.priority || 1
  };
}

/**
 * Format MCP for prompt inclusion with enhanced custom configuration support
 */
function formatMCPForPrompt(summary: any): string {
  let result = `**${summary.name}** (${summary.category}): ${summary.description}`;
  
  if (summary.useCases && summary.useCases.length > 0) {
    result += `\n  Use cases: ${summary.useCases.join(', ')}`;
  }
  
  return result;
}

/**
 * Generates a comprehensive system prompt with unified strategy and tool introspection
 * Now properly includes agent-specific custom tool configurations
 */
function generateSystemPrompt(
  mcps: any[], 
  agentToolConfigs: any[] = [],
  relevantKnowledge?: any[], 
  loopIteration: number = 0,
  agentSystemPrompt?: string
): string {
  // Filter MCPs based on agent tool configurations
  let activeMcps = mcps || [];
  if (agentToolConfigs.length > 0) {
    const activeMcpIds = agentToolConfigs
      .filter(config => config.is_active)
      .map(config => config.mcp_id);
    activeMcps = mcps.filter(mcp => activeMcpIds.includes(mcp.id));
  }

  // Create summaries with agent-specific overrides
  const mcpSummaries = activeMcps.map(mcp => {
    const toolConfig = agentToolConfigs.find(config => config.mcp_id === mcp.id);
    return createMCPSummary(mcp, toolConfig);
  });

  // Sort by priority (highest first)
  mcpSummaries.sort((a, b) => (b.priority || 1) - (a.priority || 1));
  
  const toolDescriptions = mcpSummaries
    .map(summary => formatMCPForPrompt(summary))
    .join('\n\n');

  const loopGuidance = loopIteration > 0 ? `

**🔄 IMPROVEMENT ITERATION ${loopIteration + 1}:**
You are in a self-improvement loop, reflecting on and enhancing a previous response. Focus on:
- Identifying gaps in the previous answer
- Using additional tools that could provide valuable information
- Providing deeper analysis or alternative perspectives
- Ensuring the user's request is comprehensively addressed
- Building upon previous work rather than repeating it` : `

**🔄 SELF-IMPROVEMENT CAPABILITY:**
After providing your initial response, you may reflect and decide to improve it further through:
- Additional tool usage for more comprehensive information
- Deeper analysis of the topic
- Alternative perspectives or approaches
- Enhanced detail where valuable`;

  // Use custom system prompt if provided, otherwise use default
  const basePrompt = agentSystemPrompt || `You are an intelligent AI assistant with access to powerful tools and self-improvement capabilities.

**🧠 UNIFIED RESPONSE STRATEGY:**
1. **ANSWER DIRECTLY** from your general knowledge for simple questions
2. **USE TOOLS WHEN VALUABLE** for:
   - Current/real-time information
   - Searching your previous knowledge and uploaded documents
   - External data not in your general knowledge
   - Multi-step research or analysis
   - Specific data from external sources
3. **BE PROACTIVE** - When users describe problems that match tool use cases, suggest or use tools directly, even if they don't mention them by name${loopGuidance}`;

  const toolsSection = toolDescriptions ? `

**🛠️ Available Tools:**
${toolDescriptions}

**⚠️ CRITICAL: Follow Custom Tool Instructions**
Each tool above may have specific custom use cases or instructions configured for this agent. You MUST follow these custom instructions precisely. If a tool's use cases specify particular behavior (like "ALWAYS search '23'" or specific query modifications), you must follow those instructions exactly, even if they seem unusual.

**🧠 Tool Introspection:**
If the user asks what tools you have access to, list and explain the tools above with their descriptions, categories, and use cases.

**🚀 Proactive Tool Usage:**
When users describe problems or requests that clearly match tool capabilities, suggest or use the relevant tool directly:

- "Check my GitHub repo" or "What's new in the repository?" → Use GitHub Tools
- "Find information about X" or "Look up Y" → Use Web Search  
- "What did I learn about..." or "Do I have notes on..." → Use Knowledge Search
- "Check project issues" or "Update Jira ticket" → Use Jira Tools
- "Get content from this website" → Use Web Scraper

Example proactive responses:
- User: "Can you check what issues are open in my GitHub repo?"
- Agent: "Sure! I'll use the GitHub tools to check for open issues in your repository."

**🔗 Multi-Tool Chain Examples:**
For complex requests, use multiple tools in sequence to provide comprehensive answers:

Example 1 - Research & Analysis:
- User: "Can you find recent reviews of my competitor's app and summarize them?"
- Agent:
  1. Uses **Web Search** to find pages about the competitor
  2. Uses **Web Scraper** to fetch review content from specific URLs
  3. Summarizes the reviews and presents insights

Example 2 - Knowledge Enhancement:
- User: "Search for information about React hooks and check if I have any notes on this topic"
- Agent:
  1. Uses **Knowledge Search** to check existing personal notes
  2. Uses **Web Search** to find current information if gaps exist
  3. Combines both sources for a comprehensive response

Example 3 - Code Analysis:
- User: "Analyze the recent changes in my project repository"
- Agent:
  1. Uses **GitHub Tools** to get recent commits and changes
  2. Uses **Knowledge Search** to find related project documentation
  3. Provides analysis combining code changes with project context

**🛡️ Tool Reliability & Retry Logic:**
- If a tool fails on first attempt, automatically retry once
- Only inform the user if the tool fails after retry attempts
- Suggest alternative approaches when tools are unavailable
- Continue with available tools when one tool in a chain fails

**💡 Natural Decision Making:**
- For simple greetings or basic questions, respond directly
- Use the Knowledge Search tool when you need to access previous learnings or uploaded documents
- Use Web Search for current information or external data
- Use multiple tools progressively if needed
- Build comprehensive answers step by step
- Work efficiently - don't overuse tools when direct knowledge suffices
- **Suggest tools when user requests match tool capabilities, even without explicit mention**
- **ALWAYS follow any custom tool use cases or instructions specified above**

**📋 Response Guidelines:**
- Be direct and conversational in your responses
- Proactively suggest or use tools when they add clear value to user requests
- Integrate tool results naturally into your answers
- Provide actionable, helpful information
- Cite sources when using external data
- Explain which tool you're using and why when it's not obvious
- Chain tools together for comprehensive research when beneficial
- **Strictly adhere to any custom tool instructions or use cases configured for this agent**

Remember: You have both comprehensive general knowledge and powerful tools. Be proactive in using tools when they clearly match user needs, and don't hesitate to combine multiple tools for better results. Most importantly, follow any custom tool configurations exactly as specified.` : '';

  return basePrompt + toolsSection;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { customPrompt, loopEnabled, loopIteration, agentId } = await req.json();

    let mcps = [];
    let agentToolConfigs = [];
    let agentSystemPrompt = null;

    if (agentId) {
      // Get agent details
      const { data: agent, error: agentError } = await supabaseClient
        .from('agents')
        .select('system_prompt')
        .eq('id', agentId)
        .single();

      if (agentError) {
        throw new Error('Failed to fetch agent details');
      }

      agentSystemPrompt = agent?.system_prompt;

      // Get agent tool configurations with detailed logging
      const { data: toolConfigs, error: toolConfigError } = await supabaseClient
        .from('agent_tool_configs')
        .select('*')
        .eq('agent_id', agentId);

      if (toolConfigError) {
        throw new Error('Failed to fetch agent tool configurations');
      }

      agentToolConfigs = toolConfigs || [];
      console.log(`🔧 Found ${agentToolConfigs.length} tool configurations for agent ${agentId}`);
      
      // Log custom configurations for debugging
      agentToolConfigs.forEach(config => {
        if (config.custom_use_cases && config.custom_use_cases.length > 0) {
          console.log(`🎯 Agent tool config with custom use cases:`, {
            mcpId: config.mcp_id,
            isActive: config.is_active,
            customUseCases: config.custom_use_cases
          });
        }
      });

      // Get only the MCPs that are configured for this agent
      if (agentToolConfigs.length > 0) {
        const mcpIds = agentToolConfigs.map(config => config.mcp_id);
        const { data: agentMcps, error: mcpError } = await supabaseClient
          .from('mcps')
          .select('*')
          .in('id', mcpIds);

        if (mcpError) {
          throw new Error('Failed to fetch agent-specific tools');
        }

        mcps = agentMcps || [];
      }
    } else {
      // Get default tools when no agent is specified
      const { data: defaultMcps, error: mcpError } = await supabaseClient
        .from('mcps')
        .select('*')
        .eq('isDefault', true)
        .in('default_key', ['web-search', 'github-tools', 'knowledge-search', 'jira-tools', 'web-scraper']);

      if (mcpError) {
        throw new Error('Failed to fetch available tools');
      }

      mcps = defaultMcps || [];
    }

    let systemPrompt;
    
    if (customPrompt && customPrompt.trim()) {
      // Use custom prompt if provided and not empty
      systemPrompt = customPrompt;
    } else {
      // Generate agent-aware system prompt with custom configurations
      systemPrompt = generateSystemPrompt(
        mcps, 
        agentToolConfigs, 
        [], 
        loopIteration || 0,
        agentSystemPrompt
      );
    }

    return new Response(
      JSON.stringify({ 
        systemPrompt,
        toolsCount: mcps?.length || 0,
        usedCustomPrompt: !!(customPrompt && customPrompt.trim()),
        agentId: agentId || null,
        customConfigsCount: agentToolConfigs.filter(c => c.custom_use_cases && c.custom_use_cases.length > 0).length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating system prompt:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

