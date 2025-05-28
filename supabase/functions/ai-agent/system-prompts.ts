
import { createMCPSummary, formatMCPForPrompt } from './mcp-summary.ts';

/**
 * System prompt generation utilities for unified knowledge-first approach
 */

/**
 * Generates a comprehensive system prompt with unified strategy
 */
export function generateSystemPrompt(mcps: any[], relevantKnowledge?: any[]): string {
  const mcpSummaries = mcps?.map(mcp => createMCPSummary(mcp)) || [];
  
  const toolDescriptions = mcpSummaries
    .map(summary => formatMCPForPrompt(summary))
    .join('\n\n');
  
  const knowledgeSection = relevantKnowledge && relevantKnowledge.length > 0 
    ? formatKnowledgeSection(relevantKnowledge)
    : '';

  return `You are an intelligent AI assistant with access to a knowledge base and powerful tools.

${knowledgeSection}

**🧠 UNIFIED RESPONSE STRATEGY:**
1. **ALWAYS** start by checking your knowledge base for relevant information
2. **ANSWER DIRECTLY** if your knowledge base contains sufficient information
3. **USE TOOLS NATURALLY** when you need:
   - Current/real-time information
   - External data not in your knowledge base
   - Multi-step research or analysis
   - Specific data from external sources

**🛠️ Available Tools:**
${toolDescriptions}

**💡 Natural Decision Making:**
- You can use multiple tools progressively if needed
- Build comprehensive answers step by step
- Combine knowledge base information with tool results
- Use your judgment about when tools add value
- Work efficiently - don't overuse tools when knowledge base suffices

**📋 Response Guidelines:**
- Prioritize existing knowledge but enhance with tools when valuable
- Be direct and conversational in your responses
- Integrate tool results naturally into your answers
- Provide actionable, helpful information
- Cite sources when using external data

Remember: You have both comprehensive knowledge and powerful tools. Use them wisely to provide the best possible assistance.`;
}

/**
 * Format knowledge base content as authoritative information
 */
function formatKnowledgeSection(knowledge: any[]): string {
  if (!knowledge || knowledge.length === 0) return '';
  
  const formattedKnowledge = knowledge.map((item, index) => {
    const sourceType = item.sourceType === 'node' ? `Knowledge Node (${item.nodeType || 'insight'})` : 'Document';
    return `**${index + 1}. ${item.title}** (${sourceType})
   ${item.snippet || item.description}
   Source: ${item.source || 'Internal Knowledge Base'}
   Confidence: ${item.confidence || item.relevanceScore || 'High'}`;
  }).join('\n\n');
  
  return `📚 **YOUR KNOWLEDGE BASE CONTAINS:**

${formattedKnowledge}

🔍 **Use this authoritative knowledge as your primary information source.**
`;
}

/**
 * Create knowledge-aware messages array for AI model with proper content validation
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
