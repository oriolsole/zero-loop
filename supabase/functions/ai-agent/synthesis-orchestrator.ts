
import { analyzeToolExecutionQuality, prepareSynthesisContext, generateFallbackResponse, ToolAnalysis } from './tool-analysis.ts';

/**
 * Main synthesis orchestration with tool execution awareness
 */

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

        Provide a helpful, accurate response that acknowledges tool execution context.`
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
        max_tokens: 2000
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
