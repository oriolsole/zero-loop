
import { createMCPSummary, formatMCPForPrompt } from './mcp-summary.ts';

/**
 * Pure LLM-native system prompt generation
 */

/**
 * Generates a pure LLM-driven system prompt
 */
export function generateSystemPrompt(mcps: any[], relevantKnowledge?: any[]): string {
  const mcpSummaries = mcps?.map(mcp => createMCPSummary(mcp)) || [];
  
  const toolDescriptions = mcpSummaries
    .map(summary => formatMCPForPrompt(summary))
    .join('\n\n');

  return `You are an autonomous AI assistant. You think, decide, and act naturally.

**🧠 PURE INTELLIGENCE:**
You have access to both extensive knowledge and powerful tools. Use your judgment to decide when each is appropriate.

**🛠️ Available Tools:**
${toolDescriptions}

**💭 NATURAL DECISION MAKING:**
- For simple questions, answer directly from your knowledge
- For current information or research, use web search
- For accessing previous conversations or uploaded documents, use knowledge search
- For code analysis, use GitHub tools
- Think out loud about your process
- Be conversational and helpful

**🎯 COMMUNICATION STYLE:**
- Use emojis naturally to show what you're doing (🔍 searching, ✅ found results, 🤔 thinking)
- Be direct but friendly
- Show your reasoning process
- Complete your responses thoroughly

**🔄 AUTONOMOUS BEHAVIOR:**
- You can continue working on a topic if you think it would be valuable
- You can search for additional information if needed
- You decide when a response is complete
- Always prioritize being helpful

Remember: You are in full control. Make intelligent decisions about when and how to help the user.`;
}

/**
 * Create pure message array for LLM
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

  // Add conversation history
  if (conversationHistory && Array.isArray(conversationHistory)) {
    conversationHistory.forEach(historyMessage => {
      if (historyMessage && typeof historyMessage === 'object' && historyMessage.role) {
        let content = historyMessage.content;
        
        if (content === null || content === undefined) {
          content = `[Content unavailable for ${historyMessage.role} message]`;
        } else if (typeof content !== 'string') {
          content = String(content);
        } else if (!content.trim()) {
          content = `[Empty ${historyMessage.role} message]`;
        }
        
        messages.push({
          role: historyMessage.role,
          content: content
        });
      }
    });
  }

  // Add current user message
  let validatedUserMessage = userMessage;
  if (!validatedUserMessage || typeof validatedUserMessage !== 'string') {
    validatedUserMessage = String(validatedUserMessage || 'Empty message');
  }
  
  messages.push({
    role: 'user',
    content: validatedUserMessage
  });

  // Filter out any invalid messages
  const validatedMessages = messages.filter(msg => {
    return msg && msg.role && msg.content && typeof msg.content === 'string' && msg.content.trim();
  });

  console.log(`Pure message creation: ${messages.length} -> ${validatedMessages.length} messages`);
  
  return validatedMessages;
}
