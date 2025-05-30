
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create MCP summary for system prompt
 */
function createMCPSummary(mcp: any) {
  return {
    name: mcp.title || 'Unknown Tool', // Fixed: use mcp.title instead of mcp.name
    description: mcp.description || 'No description available',
    category: mcp.category || 'general',
    useCases: mcp.sampleUseCases || [] // Fixed: use sampleUseCases instead of use_cases
  };
}

/**
 * Format MCP for prompt inclusion
 */
function formatMCPForPrompt(summary: any): string {
  const useCases = summary.useCases && summary.useCases.length > 0 
    ? `\n  Use cases: ${summary.useCases.join(', ')}`
    : '';
  
  return `**${summary.name}** (${summary.category}): ${summary.description}${useCases}`;
}

/**
 * Generates a comprehensive system prompt with unified strategy and tool introspection
 */
function generateSystemPrompt(mcps: any[], relevantKnowledge?: any[], loopIteration: number = 0): string {
  // Sort MCPs by priority before creating summaries (highest priority first)
  const sortedMCPs = [...(mcps || [])].sort((a, b) => (b.priority || 1) - (a.priority || 1));
  const mcpSummaries = sortedMCPs.map(mcp => createMCPSummary(mcp));
  
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

  return `You are an intelligent AI assistant with access to powerful tools and self-improvement capabilities.

**🧠 UNIFIED RESPONSE STRATEGY:**
1. **ANSWER DIRECTLY** from your general knowledge for simple questions
2. **USE TOOLS WHEN VALUABLE** for:
   - Current/real-time information
   - Searching your previous knowledge and uploaded documents
   - External data not in your general knowledge
   - Multi-step research or analysis
   - Specific data from external sources
3. **BE PROACTIVE** - When users describe problems that match tool use cases, suggest or use tools directly, even if they don't mention them by name${loopGuidance}

**🛠️ Available Tools:**
${toolDescriptions}

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

**📋 Response Guidelines:**
- Be direct and conversational in your responses
- Proactively suggest or use tools when they add clear value to user requests
- Integrate tool results naturally into your answers
- Provide actionable, helpful information
- Cite sources when using external data
- Explain which tool you're using and why when it's not obvious
- Chain tools together for comprehensive research when beneficial

Remember: You have both comprehensive general knowledge and powerful tools. Be proactive in using tools when they clearly match user needs, and don't hesitate to combine multiple tools for better results.`;
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

    const { customPrompt, loopEnabled, loopIteration } = await req.json();

    // Get available tools (MCPs)
    const { data: mcps, error: mcpError } = await supabaseClient
      .from('mcps')
      .select('*')
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search', 'jira-tools', 'web-scraper']);

    if (mcpError) {
      throw new Error('Failed to fetch available tools');
    }

    let systemPrompt;
    
    if (customPrompt && customPrompt.trim()) {
      // Use custom prompt if provided and not empty
      systemPrompt = customPrompt;
    } else {
      // Generate default system prompt
      systemPrompt = generateSystemPrompt(mcps || [], [], loopIteration || 0);
    }

    return new Response(
      JSON.stringify({ 
        systemPrompt,
        toolsCount: mcps?.length || 0,
        usedCustomPrompt: !!(customPrompt && customPrompt.trim())
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
