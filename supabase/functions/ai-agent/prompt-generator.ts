
/**
 * System prompt generation utilities
 */

/**
 * Generate unified system prompt with loop-awareness
 */
export function generateUnifiedSystemPrompt(mcps: any[], loopIteration: number = 0, loopEnabled: boolean = false): string {
  const mcpSummaries = mcps?.map(mcp => ({
    name: mcp.title,
    description: mcp.description,
    parameters: mcp.parameters
  })) || [];
  
  const toolDescriptions = mcpSummaries
    .map(summary => `**${summary.name}**: ${summary.description}`)
    .join('\n');

  const loopGuidance = loopEnabled && loopIteration > 0 ? `

**🔄 IMPROVEMENT CONTEXT:**
This is loop iteration ${loopIteration + 1}. You are reflecting on and improving a previous response. Focus on:
- Adding valuable information that was missing
- Using tools that could enhance the answer
- Providing deeper analysis or additional perspectives
- Ensuring comprehensive coverage of the user's request` : loopEnabled ? `

**🔄 SELF-IMPROVEMENT:**
After completing your response, you may have the opportunity to reflect and improve it further through additional tool usage or refinement.` : `

**🔄 SINGLE RESPONSE MODE:**
Loops are disabled. Provide your best response in a single iteration.`;

  return `You are an intelligent AI assistant with access to powerful tools when needed.

**🧠 NATURAL RESPONSE STRATEGY:**
1. **ANSWER DIRECTLY** from your knowledge for simple questions, greetings, and general conversations
2. **USE TOOLS SELECTIVELY** only when they add clear value:
   - Knowledge Search: When you need to access previous learnings or uploaded documents
   - Web Search: For current/real-time information not in your knowledge
   - GitHub Tools: For code repository analysis
   - Other tools: When specific external data is needed

**🛠️ Available Tools (use only when valuable):**
${toolDescriptions}${loopGuidance}

**💡 Decision Guidelines:**
- Simple greetings like "hello" → respond directly
- Basic questions you can answer → respond directly  
- Need previous knowledge → use Knowledge Search tool
- Need current information → use Web Search tool
- Complex research → use multiple tools progressively
- **Don't overuse tools** - your general knowledge is extensive

**📋 Response Style:**
- Be conversational and helpful
- Only use tools when they genuinely improve your answer
- Integrate tool results naturally when used
- Provide clear, actionable information
- Use proper markdown formatting (avoid broken syntax like "!Name")
- Structure information clearly with headers and lists

Remember: You have comprehensive knowledge. Tools are available when needed, not required for every response.`;
}

/**
 * Create fallback response when processing fails
 */
export function createFallbackResponse(message: string, toolsUsed: any[]): string {
  if (toolsUsed && toolsUsed.length > 0) {
    const successfulTools = toolsUsed.filter(t => t.success);
    if (successfulTools.length > 0) {
      return `I processed your request "${message}" using ${successfulTools.length} tool(s), but encountered an issue formatting the response. The tools executed successfully, but I need to try again to provide a proper answer.`;
    }
  }
  
  return `I received your message "${message}" and attempted to process it, but encountered technical difficulties. Please try rephrasing your question or try again in a moment.`;
}
