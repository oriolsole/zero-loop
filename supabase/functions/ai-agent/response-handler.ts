/**
 * Enhanced response handler with comprehensive validation and guaranteed non-null responses
 */

/**
 * Extract assistant message from AI model response with enhanced validation and fallbacks
 */
export function extractAssistantMessage(response: any): string {
  try {
    // Handle different response formats
    if (!response) {
      console.error('[EXTRACT_MESSAGE] No response provided to extractAssistantMessage');
      return 'I apologize, but I encountered an error processing your request. Please try again.';
    }

    // Check for direct message content (some APIs return this directly)
    if (typeof response === 'string') {
      const content = response.trim();
      return content || 'I apologize, but I received an empty response. Please try again.';
    }

    // Standard OpenAI format: response.choices[0].message.content
    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0];
      
      // Handle tool calls scenario
      if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
        // If there are tool calls, return any content or indicate tool usage
        const content = choice.message?.content;
        if (content && content.trim()) {
          return content.trim();
        }
        // If no content but tool calls exist, return a placeholder
        return 'Processing your request with available tools...';
      }
      
      // Standard message content
      if (choice.message?.content) {
        const content = choice.message.content.trim();
        return content || 'I apologize, but I received an empty response. Please try again.';
      }
    }

    // Handle direct content field
    if (response.content) {
      const content = String(response.content).trim();
      return content || 'I apologize, but I received an empty response. Please try again.';
    }

    // Handle message field directly
    if (response.message) {
      if (typeof response.message === 'string') {
        const content = response.message.trim();
        return content || 'I apologize, but I received an empty response. Please try again.';
      }
      if (response.message.content) {
        const content = String(response.message.content).trim();
        return content || 'I apologize, but I received an empty response. Please try again.';
      }
    }

    // Handle data field (some APIs wrap response in data)
    if (response.data) {
      return extractAssistantMessage(response.data);
    }

    // If we can't find content, log the response structure for debugging
    console.error('[EXTRACT_MESSAGE] Could not extract message from response structure:', {
      hasChoices: !!response.choices,
      choicesLength: response.choices?.length || 0,
      hasContent: !!response.content,
      hasMessage: !!response.message,
      hasData: !!response.data,
      responseKeys: Object.keys(response || {})
    });
    
    return 'I apologize, but I encountered an issue processing the AI response. Please try again.';
  } catch (error) {
    console.error('[EXTRACT_MESSAGE] Error in extractAssistantMessage:', error);
    return 'I apologize, but I encountered an error processing your request. Please try again.';
  }
}

/**
 * Synthesize final response with awareness of tool execution context
 */
export async function synthesizeFinalResponse(
  originalMessage: string,
  toolResults: any[],
  knowledgeResults: any[],
  accumulatedContext: any[],
  supabase: any
): Promise<string> {
  try {
    console.log('🔧 Synthesizing tool results with enhanced context awareness:', { 
      toolCount: toolResults.length, 
      knowledgeCount: knowledgeResults.length,
      originalResponseLength: originalMessage.length 
    });

    // Analyze tool execution quality
    const toolAnalysis = analyzeToolExecutionQuality(toolResults);
    
    // Prepare context for synthesis
    const synthesisContext = prepareSynthesisContext(
      originalMessage,
      toolResults,
      knowledgeResults,
      toolAnalysis
    );

    const synthesisMessages = [
      {
        role: 'system',
        content: `You are an AI assistant providing comprehensive answers based on tool execution results and knowledge base searches.

        IMPORTANT SYNTHESIS GUIDELINES:
        
        1. **Tool Execution Awareness**: 
           - Tool Quality: ${toolAnalysis.quality}
           - Successful Tools: ${toolAnalysis.successfulTools}/${toolAnalysis.totalTools}
           - Failed Tools: ${toolAnalysis.failedTools.length}
           - Empty Results: ${toolAnalysis.emptyResults.length}

        2. **Data Absence vs Negative Data**:
           - If tools failed or returned empty results, say "Unable to retrieve data" rather than "No data exists"
           - Distinguish between "No results found" and "No data available in the system"
           - Be transparent about tool limitations or access issues

        3. **Confidence Indicators**:
           - Use phrases like "Based on available data..." for partial results
           - Include "Current search returned no results" for empty tool responses
           - Mention "Tool execution encountered issues" when tools fail

        4. **Knowledge Integration**:
           - Prioritize verified knowledge over tentative insights
           - Flag tentative or deprecated knowledge appropriately
           - Use knowledge to provide context even when tools fail

        5. **Transparency**:
           - Be clear about data source limitations
           - Mention when results may be incomplete due to tool issues
           - Suggest alternative approaches when primary tools fail

        6. **Completeness**:
           - Include ALL relevant information from successful tool executions
           - Don't truncate or summarize excessively - provide full details
           - Organize information clearly with proper formatting

        Provide a helpful, accurate response that acknowledges tool execution context and includes complete information.`
      },
      {
        role: 'user',
        content: synthesisContext
      }
    ];

    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: synthesisMessages,
        temperature: 0.7,
        max_tokens: 3000  // Increased to handle larger responses
      }
    });

    if (response.error) {
      console.error('Error in synthesis:', response.error);
      return generateFallbackResponse(originalMessage, toolResults, knowledgeResults, toolAnalysis);
    }

    const synthesizedResponse = response.data?.choices?.[0]?.message?.content;
    
    if (!synthesizedResponse || !synthesizedResponse.trim()) {
      console.log('No synthesis response received, using fallback');
      return generateFallbackResponse(originalMessage, toolResults, knowledgeResults, toolAnalysis);
    }

    console.log('📋 Synthesis result: Success', `(${synthesizedResponse.length} chars)`);
    return synthesizedResponse.trim();

  } catch (error) {
    console.error('Error in synthesizeFinalResponse:', error);
    return generateFallbackResponse(originalMessage, toolResults, knowledgeResults, null);
  }
}

/**
 * Analyze tool execution quality and patterns
 */
function analyzeToolExecutionQuality(toolResults: any[]): {
  quality: 'high' | 'medium' | 'low' | 'failed';
  totalTools: number;
  successfulTools: number;
  failedTools: any[];
  emptyResults: any[];
  hasData: boolean;
} {
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
function prepareSynthesisContext(
  originalMessage: string,
  toolResults: any[],
  knowledgeResults: any[],
  toolAnalysis: any
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
          // Include more result data for better synthesis
          const resultString = typeof tool.result === 'string' 
            ? tool.result 
            : JSON.stringify(tool.result, null, 2);
          context += `   Result: ${resultString}\n`;
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
5. Includes ALL relevant details from successful tool executions
6. Suggests next steps if tools failed or returned empty results
7. Formats the information clearly and completely`;

  return context;
}

/**
 * Generate fallback response when synthesis fails
 */
function generateFallbackResponse(
  originalMessage: string,
  toolResults: any[],
  knowledgeResults: any[],
  toolAnalysis: any
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
