import { createMCPSummary, formatMCPForPrompt } from './mcp-summary.ts';

/**
 * System prompt generation utilities for knowledge-first approach with natural tool selection
 */

/**
 * Generates a comprehensive system prompt with knowledge-first strategy and progressive interaction
 */
export function generateSystemPrompt(mcps: any[], relevantKnowledge?: any[]): string {
  // Create condensed summaries for all MCPs
  const mcpSummaries = mcps?.map(mcp => createMCPSummary(mcp)) || [];
  
  // Format tool descriptions with rich metadata
  const toolDescriptions = mcpSummaries
    .map(summary => formatMCPForPrompt(summary))
    .join('\n\n');
  
  // Format knowledge base content if available
  const knowledgeSection = relevantKnowledge && relevantKnowledge.length > 0 
    ? formatKnowledgeSection(relevantKnowledge)
    : '';

  return `You are an intelligent AI assistant with access to a knowledge base and powerful tools.

${knowledgeSection}

**🧠 PROGRESSIVE INTERACTION PRINCIPLES:**
1. **THINK STEP-BY-STEP** - Break complex requests into clear phases
2. **ANNOUNCE BEFORE ACTING** - Tell users what you're about to do before doing it
3. **USE KNOWLEDGE FIRST** - Always check your knowledge base before using tools
4. **BE CONVERSATIONAL** - Use natural transitions like "Let me check...", "Now I'll...", "Based on this..."
5. **REPORT IMMEDIATELY** - Share results as soon as you get them
6. **GUIDE THE FLOW** - Suggest next steps based on what you discover

**🛠️ Available Tools (use strategically and announce usage):**
${toolDescriptions}

**📋 Progressive Response Guidelines:**
- Start by announcing your approach: "Let me [action] to [goal]..."
- Before each tool use, explain why: "I'll search for [X] because [Y]"
- After each result, provide immediate feedback: "I found [X], which means [Y]"
- Use natural transitions: "Now that I have [X], let me [Y]..."
- End with actionable next steps or follow-up suggestions

**🎯 Tool Usage Strategy:**
- **Knowledge Search** → Use first for internal information
- **Web Search** → Use for current/external information  
- **GitHub Tools** → Use for code analysis and repository insights
- **Jira Tools** → Use for project management data
- **Web Scraper** → Use for specific website content

**💡 Conversation Flow Examples:**
- "Let me check your knowledge base for information about [topic]..."
- "I found some relevant information, but let me also search the web for the latest updates..."
- "Based on what I've gathered, I should also look at [specific aspect]..."
- "Now I have comprehensive information. Here's what this means for you..."

Remember: Your goal is to be transparent, helpful, and guide users through your reasoning process naturally.`;
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

  // Inject knowledge as assistant messages with proper content validation
  if (relevantKnowledge && relevantKnowledge.length > 0) {
    relevantKnowledge.forEach(knowledge => {
      // Validate knowledge content before creating message
      let knowledgeContent = '';
      
      if (knowledge.snippet && typeof knowledge.snippet === 'string' && knowledge.snippet.trim()) {
        knowledgeContent = knowledge.snippet;
      } else if (knowledge.description && typeof knowledge.description === 'string' && knowledge.description.trim()) {
        knowledgeContent = knowledge.description;
      } else if (knowledge.content && typeof knowledge.content === 'string' && knowledge.content.trim()) {
        knowledgeContent = knowledge.content;
      } else {
        // Fallback if no valid content is found
        knowledgeContent = `Knowledge item: ${knowledge.title || 'Untitled'} - Content not available`;
        console.warn('Knowledge item has no valid content:', knowledge);
      }
      
      // Create the knowledge message with validated content
      const knowledgeMessage = {
        role: 'assistant',
        content: `From knowledge base: ${knowledge.title || 'Untitled Knowledge'}\n${knowledgeContent}`
      };
      
      messages.push(knowledgeMessage);
    });
  }

  // Add conversation history with validation
  if (conversationHistory && Array.isArray(conversationHistory)) {
    conversationHistory.forEach(historyMessage => {
      // Validate each history message
      if (historyMessage && typeof historyMessage === 'object' && historyMessage.role) {
        let content = historyMessage.content;
        
        // Ensure content is a valid string
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

  // Add current user message with validation
  let validatedUserMessage = userMessage;
  if (!validatedUserMessage || typeof validatedUserMessage !== 'string') {
    validatedUserMessage = String(validatedUserMessage || 'Empty message');
    console.warn('User message was not a valid string, converted');
  }
  
  messages.push({
    role: 'user',
    content: validatedUserMessage
  });

  // Final validation pass - ensure all messages have valid content
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
