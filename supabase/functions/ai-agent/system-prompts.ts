import { createMCPSummary, formatMCPForPrompt } from './mcp-summary.ts';

/**
 * System prompt generation utilities for unified knowledge-first approach with self-improvement loops
 */

/**
 * Generates a comprehensive system prompt with unified strategy and tool introspection
 * Now properly includes agent-specific custom tool configurations
 */
export function generateSystemPrompt(mcps: any[], relevantKnowledge?: any[], loopIteration: number = 0): string {
  // Sort MCPs by priority before creating summaries (highest priority first)
  const sortedMCPs = [...(mcps || [])].sort((a, b) => (b.priority || 1) - (a.priority || 1));
  
  // Log custom configurations for debugging
  sortedMCPs.forEach(mcp => {
    if (mcp.agent_config && (mcp.agent_config.custom_title || mcp.agent_config.custom_description || 
        (mcp.agent_config.custom_use_cases && mcp.agent_config.custom_use_cases.length > 0))) {
      console.log(`📝 Including custom configuration for tool "${mcp.title}":`, {
        originalTitle: mcp.agent_config.custom_title ? 'CUSTOM' : 'default',
        originalDescription: mcp.agent_config.custom_description ? 'CUSTOM' : 'default',
        customUseCases: mcp.agent_config.custom_use_cases?.length || 0
      });
    }
  });
  
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

Remember: You have both comprehensive general knowledge and powerful tools. Be proactive in using tools when they clearly match user needs, and don't hesitate to combine multiple tools for better results. Most importantly, follow any custom tool configurations exactly as specified.`;
}

/**
 * Create messages array for AI model with proper content validation
 * No longer forces knowledge injection
 */
export function createKnowledgeAwareMessages(
  systemPrompt: string,
  conversationHistory: any[],
  userMessage: string,
  relevantKnowledge?: any[]
): any[] {
  const messages = [
    {
      role: 'system',
      content: systemPrompt
    }
  ];

  // Only inject knowledge if explicitly provided (from knowledge search tool results)
  if (relevantKnowledge && relevantKnowledge.length > 0) {
    relevantKnowledge.forEach(knowledge => {
      let knowledgeContent = '';
      
      if (knowledge.snippet && typeof knowledge.snippet === 'string' && knowledge.snippet.trim()) {
        knowledgeContent = knowledge.snippet;
      } else if (knowledge.description && typeof knowledge.description === 'string' && knowledge.description.trim()) {
        knowledgeContent = knowledge.description;
      } else if (knowledge.content && typeof knowledge.content === 'string' && knowledge.content.trim()) {
        knowledgeContent = knowledge.content;
      } else {
        knowledgeContent = `Knowledge item: ${knowledge.title || 'Untitled'} - Content not available`;
        console.warn('Knowledge item has no valid content:', knowledge);
      }
      
      const knowledgeMessage = {
        role: 'assistant',
        content: `From knowledge base: ${knowledge.title || 'Untitled Knowledge'}\n${knowledgeContent}`
      };
      
      messages.push(knowledgeMessage);
    });
  }

  if (conversationHistory && Array.isArray(conversationHistory)) {
    conversationHistory.forEach(historyMessage => {
      if (historyMessage && typeof historyMessage === 'object' && historyMessage.role) {
        let content = historyMessage.content;
        
        if (content === null || content === undefined) {
          content = `[Content unavailable for ${historyMessage.role} message]`;
          console.warn('History message has null/undefined content, using placeholder');
        } else if (typeof content !== 'string') {
          content = String(content);
          console.warn('History message content was not a string, converted');
        } else if (!content.trim()) {
          content = `[Empty ${historyMessage.role} message]`;
        }
        
        messages.push({
          role: historyMessage.role,
          content: content
        });
      } else {
        console.warn('Invalid history message found, skipping:', historyMessage);
      }
    });
  }

  let validatedUserMessage = userMessage;
  if (!validatedUserMessage || typeof validatedUserMessage !== 'string') {
    validatedUserMessage = String(validatedUserMessage || 'Empty message');
    console.warn('User message was not a valid string, converted');
  }
  
  messages.push({
    role: 'user',
    content: validatedUserMessage
  });

  const validatedMessages = messages.filter(msg => {
    if (!msg || !msg.role || !msg.content || typeof msg.content !== 'string' || !msg.content.trim()) {
      console.warn('Removing invalid message:', msg);
      return false;
    }
    return true;
  });

  console.log(`Message validation: ${messages.length} -> ${validatedMessages.length} messages`);
  
  return validatedMessages;
}
