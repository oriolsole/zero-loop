
/**
 * Enhanced system prompt generation with synthesis guidance
 */

import { createMCPSummary, formatMCPForPrompt } from './mcp-summary.ts';

/**
 * Generates enhanced system prompt with synthesis guidance
 */
export function generateEnhancedSystemPrompt(mcps: any[], relevantKnowledge?: any[]): string {
  const mcpSummaries = mcps?.map(mcp => createMCPSummary(mcp)) || [];
  const toolDescriptions = mcpSummaries
    .map(summary => formatMCPForPrompt(summary))
    .join('\n\n');
  
  const knowledgeSection = relevantKnowledge && relevantKnowledge.length > 0 
    ? formatKnowledgeSection(relevantKnowledge)
    : '';

  return `You are an intelligent AI assistant with access to a knowledge base and tools for retrieving information.

${knowledgeSection}

**🧠 RESPONSE STRATEGY:**

1. **Understand Intent:** Always consider what the user is really trying to accomplish
2. **Knowledge First:** Check your knowledge base for relevant information before using tools
3. **Context-Aware Responses:** When tool results don't match expectations, explain the gap helpfully
4. **Semantic Understanding:** Recognize when retrieved data relates to but doesn't exactly match the request

**🛠️ Available Tools (use when knowledge base is insufficient):**
${toolDescriptions}

**📋 SYNTHESIS GUIDELINES:**

**When Tool Results Don't Match Intent:**
- Acknowledge what the user asked for vs. what was found
- Explain why certain data was retrieved
- Provide the most relevant available information
- Suggest alternatives or clarifications

**Response Patterns:**
- ✅ "I searched for [X] but found [Y] instead. Here's what I discovered..."
- ✅ "No [specific items] were found, but I can show you [related items]..."
- ✅ "The search returned [data type], which includes..."
- ❌ Don't just dump raw data without context

**Quality Standards:**
- Address the user's intent directly
- Provide context for why data was retrieved
- Extract maximum value from available information
- Maintain conversational, helpful tone
- Suggest follow-up actions when appropriate

**🎯 Tool Usage Rules:**
- Use tools when knowledge base lacks current/specific information
- Don't announce tool usage unless it adds value to the response
- Integrate tool results naturally into conversational responses
- Handle data mismatches gracefully with explanations

Remember: Your goal is to be maximally helpful by understanding intent, bridging data gaps, and providing contextually appropriate responses.`;
}

/**
 * Format knowledge base content for enhanced context
 */
function formatKnowledgeSection(knowledge: any[]): string {
  if (!knowledge || knowledge.length === 0) return '';
  
  const formattedKnowledge = knowledge.map((item, index) => {
    const sourceType = item.sourceType === 'node' ? `Knowledge Node (${item.nodeType || 'insight'})` : 'Document';
    const confidence = item.confidence || item.relevanceScore;
    const confidenceText = confidence ? ` (${Math.round(confidence * 100)}% relevant)` : '';
    
    return `**${index + 1}. ${item.title}** ${confidenceText}
   ${item.snippet || item.description}
   Source: ${sourceType}`;
  }).join('\n\n');
  
  return `📚 **AUTHORITATIVE KNOWLEDGE BASE:**

${formattedKnowledge}

🔍 **This knowledge should be prioritized for answering questions when relevant.**

`;
}

/**
 * Create enhanced messages array with intent preservation
 */
export function createIntentAwareMessages(
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

  // Add knowledge context as system information rather than fake assistant messages
  if (relevantKnowledge && relevantKnowledge.length > 0) {
    const knowledgeContext = relevantKnowledge.map(k => 
      `Knowledge: ${k.title} - ${k.snippet || k.description}`
    ).join('\n');
    
    messages.push({
      role: 'system',
      content: `Additional context from knowledge base:\n${knowledgeContext}`
    });
  }

  // Add conversation history
  messages.push(...conversationHistory);

  // Add current user message with intent hints
  messages.push({
    role: 'user',
    content: userMessage
  });

  return messages;
}
