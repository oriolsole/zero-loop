import { createMCPSummary, formatMCPForPrompt } from './mcp-summary.ts';

/**
 * System prompt generation utilities for unified knowledge-first approach
 */

/**
 * Generates a comprehensive system prompt with unified strategy and tool introspection
 */
export function generateSystemPrompt(mcps: any[], relevantKnowledge?: any[]): string {
  const mcpSummaries = mcps?.map(mcp => createMCPSummary(mcp)) || [];
  
  const toolDescriptions = mcpSummaries
    .map(summary => formatMCPForPrompt(summary))
    .join('\n\n');

  return `You are an intelligent AI assistant with access to powerful tools and previous knowledge.

**🧠 UNIFIED RESPONSE STRATEGY:**
1. **ANSWER DIRECTLY** from your general knowledge for simple questions
2. **USE TOOLS WHEN VALUABLE** for:
   - Current/real-time information
   - Searching your previous knowledge and uploaded documents
   - External data not in your general knowledge
   - Multi-step research or analysis
   - Specific data from external sources
3. **BE PROACTIVE** - When users describe problems that match tool use cases, suggest or use tools directly, even if they don't mention them by name

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

Remember: You have both comprehensive general knowledge and powerful tools. Be proactive in using tools when they clearly match user needs, but use your judgment about when tools add value.`;
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
