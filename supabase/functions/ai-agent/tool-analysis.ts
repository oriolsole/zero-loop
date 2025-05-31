
/**
 * Tool execution analysis utilities
 */

export interface ToolAnalysis {
  quality: 'high' | 'medium' | 'low' | 'failed';
  totalTools: number;
  successfulTools: number;
  failedTools: any[];
  emptyResults: any[];
  hasData: boolean;
}

/**
 * Analyze tool execution quality and patterns
 */
export function analyzeToolExecutionQuality(toolResults: any[]): ToolAnalysis {
  if (!toolResults || toolResults.length === 0) {
    return {
      quality: 'medium',
      totalTools: 0,
      successfulTools: 0,
      failedTools: [],
      emptyResults: [],
      hasData: false
    };
  }

  const successfulTools = toolResults.filter(tool => tool.success);
  const failedTools = toolResults.filter(tool => !tool.success);
  
  // Check for empty results in successful tools
  const emptyResults = successfulTools.filter(tool => {
    const result = tool.result;
    if (!result) return true;
    
    if (typeof result === 'object') {
      if (result.total === 0) return true;
      if (result.issues && result.issues.length === 0) return true;
      if (result.results && result.results.length === 0) return true;
      if (Array.isArray(result) && result.length === 0) return true;
    }
    
    return false;
  });

  const hasData = successfulTools.length > emptyResults.length;
  
  let quality: 'high' | 'medium' | 'low' | 'failed';
  
  if (failedTools.length === toolResults.length) {
    quality = 'failed';
  } else if (emptyResults.length > successfulTools.length / 2) {
    quality = 'low';
  } else if (failedTools.length > 0) {
    quality = 'medium';
  } else {
    quality = 'high';
  }

  return {
    quality,
    totalTools: toolResults.length,
    successfulTools: successfulTools.length,
    failedTools,
    emptyResults,
    hasData
  };
}

/**
 * Prepare synthesis context with tool execution awareness
 */
export function prepareSynthesisContext(
  originalMessage: string,
  toolResults: any[],
  knowledgeResults: any[],
  toolAnalysis: ToolAnalysis
): string {
  let context = `Original Question: "${originalMessage}"\n\n`;
  
  // Add tool execution summary
  context += `TOOL EXECUTION SUMMARY:\n`;
  context += `- Quality: ${toolAnalysis.quality}\n`;
  context += `- Total Tools: ${toolAnalysis.totalTools}\n`;
  context += `- Successful: ${toolAnalysis.successfulTools}\n`;
  context += `- Failed: ${toolAnalysis.failedTools.length}\n`;
  context += `- Empty Results: ${toolAnalysis.emptyResults.length}\n`;
  context += `- Has Data: ${toolAnalysis.hasData}\n\n`;

  // Add tool results with context
  if (toolResults.length > 0) {
    context += `TOOL RESULTS:\n`;
    toolResults.forEach((tool, index) => {
      context += `${index + 1}. Tool: ${tool.name}\n`;
      context += `   Success: ${tool.success}\n`;
      
      if (!tool.success) {
        context += `   Error: ${tool.error || 'Unknown error'}\n`;
      } else {
        const hasData = tool.result && (
          (typeof tool.result === 'object' && Object.keys(tool.result).length > 0) ||
          (Array.isArray(tool.result) && tool.result.length > 0) ||
          (typeof tool.result === 'string' && tool.result.length > 0)
        );
        
        context += `   Has Data: ${hasData}\n`;
        
        if (hasData) {
          context += `   Result: ${JSON.stringify(tool.result, null, 2)}\n`;
        } else {
          context += `   Result: Empty or no data returned\n`;
        }
      }
      context += '\n';
    });
  }

  // Add knowledge results
  if (knowledgeResults.length > 0) {
    context += `KNOWLEDGE BASE RESULTS:\n`;
    knowledgeResults.forEach((knowledge, index) => {
      context += `${index + 1}. ${knowledge.title}\n`;
      context += `   Source: ${knowledge.source || 'Knowledge Base'}\n`;
      context += `   Relevance: ${knowledge.relevanceScore || 'N/A'}\n`;
      context += `   Content: ${knowledge.snippet}\n`;
      
      // Add quality indicators
      if (knowledge.metadata?.is_tentative) {
        context += `   ⚠️ Marked as tentative/unverified\n`;
      }
      if (knowledge.metadata?.validation_status === 'deprecated') {
        context += `   ❌ Marked as deprecated\n`;
      }
      context += '\n';
    });
  }

  context += `\nPlease provide a comprehensive answer that:
1. Acknowledges the tool execution context
2. Differentiates between "no data found" and "no data exists"
3. Uses available knowledge appropriately
4. Is transparent about limitations
5. Suggests next steps if tools failed or returned empty results`;

  return context;
}

/**
 * Generate fallback response when synthesis fails
 */
export function generateFallbackResponse(
  originalMessage: string,
  toolResults: any[],
  knowledgeResults: any[],
  toolAnalysis: ToolAnalysis | null
): string {
  let response = `I attempted to address your question: "${originalMessage}"\n\n`;

  if (toolAnalysis) {
    if (toolAnalysis.quality === 'failed') {
      response += `Unfortunately, all tool executions encountered issues, which may indicate connectivity problems or access limitations. `;
    } else if (toolAnalysis.quality === 'low') {
      response += `The search returned limited results. This could indicate that the requested information is not available in the current data sources, or there may be access limitations. `;
    } else if (!toolAnalysis.hasData) {
      response += `The search completed successfully but returned no data. This suggests the requested information may not be present in the accessible data sources. `;
    }
  }

  if (knowledgeResults.length > 0) {
    response += `However, I found some related information in the knowledge base:\n\n`;
    knowledgeResults.slice(0, 3).forEach((knowledge, index) => {
      response += `${index + 1}. ${knowledge.title}: ${knowledge.snippet}\n`;
    });
  }

  response += `\nFor more specific information, you might want to:
- Check if you have the necessary access permissions
- Verify the search terms or identifiers
- Try a different approach or consult additional data sources`;

  return response;
}
