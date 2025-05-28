
import { createMCPSummary, formatMCPForPrompt } from './mcp-summary.ts';

/**
 * System prompt generation utilities for knowledge-first approach with natural tool selection
 */

/**
 * Generates a comprehensive system prompt with knowledge-first strategy
 */
export function generateSystemPrompt(mcps: any[], relevantKnowledge?: any[]): string {
  const mcpSummaries = mcps?.map(mcp => createMCPSummary(mcp)) || [];
  
  const toolDescriptions = mcpSummaries
    .map(summary => formatMCPForPrompt(summary))
    .join('\n\n');
  
  const knowledgeSection = relevantKnowledge && relevantKnowledge.length > 0 
    ? formatKnowledgeSection(relevantKnowledge)
    : '';

  return `You are an intelligent AI assistant with access to a knowledge base and fallback tools.

${knowledgeSection}

**🧠 KNOWLEDGE-FIRST RESPONSE RULES:**
1. **ALWAYS** check if your knowledge base contains relevant information first
2. **ONLY** use tools if the knowledge base does not contain sufficient information
3. **CITE** which knowledge sources you used in your response when applicable
4. **BE DIRECT** - answer from knowledge base content when available

**🛠️ Available Fallback Tools (use only when knowledge base is insufficient):**
${toolDescriptions}

**🎯 Response Guidelines:**
- Start by checking your knowledge base for relevant information
- If knowledge base has the answer, use it directly and cite the source
- Only reach for tools when you need additional or current information
- Work silently - don't announce tool usage unless it adds value
- Provide direct, conversational answers
- Integrate any tool results naturally into your response

**📋 Tool Usage Rules:**
- Tools are secondary strategies for finding new information
- Before using any tool, verify the knowledge base cannot answer the question
- Use tools for current events, real-time data, or when knowledge gaps exist
- Don't use tools if knowledge base already contains comprehensive information

Remember: Your knowledge base contains valuable, specific information that should be prioritized over general web search results or fresh tool calls.`;
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

🔍 **This knowledge is authoritative and should be used to answer questions when relevant.**
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
