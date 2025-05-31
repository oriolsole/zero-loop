
import { extractAssistantMessage } from './response-handler.ts';

/**
 * Result synthesis utilities
 */

/**
 * Synthesize results from tools and knowledge
 */
export async function synthesizeResults(
  originalMessage: string,
  conversationHistory: any[],
  toolsUsed: any[],
  originalResponse: string,
  modelSettings: any,
  supabase: any
): Promise<string | null> {
  try {
    const toolResultsSummary = toolsUsed.map(tool => {
      if (tool.success && tool.result) {
        const resultPreview = typeof tool.result === 'string' 
          ? tool.result.substring(0, 500) + (tool.result.length > 500 ? '...' : '')
          : JSON.stringify(tool.result).substring(0, 500);
        return `${tool.name}: ${resultPreview}`;
      }
      return `${tool.name}: Failed`;
    }).join('\n');

    const synthesisMessages = [
      {
        role: 'system',
        content: `Provide a comprehensive, well-structured answer based on the tool results.

**IMPORTANT FORMATTING RULES:**
- Use proper markdown syntax only
- Do NOT use broken image syntax like "!Nike", "!Adidas" 
- Use **bold** for emphasis, not broken image references
- Structure content with clear headers (##, ###)
- Use bullet points for lists
- Ensure all markdown is valid and renders properly

User asked: "${originalMessage}"

Tool results:
${toolResultsSummary}

Create a clear, helpful response that integrates this information naturally. Format appropriately for readability with proper markdown only.`
      },
      {
        role: 'user',
        content: originalMessage
      }
    ];

    const synthesisResponse = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: synthesisMessages,
        temperature: 0.3,
        max_tokens: 1000,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel,
          localModelUrl: modelSettings.localModelUrl
        })
      }
    });
    
    if (synthesisResponse.error) {
      console.error('Synthesis failed:', synthesisResponse.error);
      return null;
    }
    
    return extractAssistantMessage(synthesisResponse.data);
    
  } catch (error) {
    console.error('Error in synthesis:', error);
    return null;
  }
}
