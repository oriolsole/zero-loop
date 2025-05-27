
/**
 * Enhanced synthesis utilities for context-aware, intent-preserving responses
 */

/**
 * Analyzes user intent and retrieved data to generate context-aware synthesis prompts
 */
export function generateIntentAwareSynthesisPrompt(
  originalQuery: string,
  toolResults: any[],
  iterationContext?: any[]
): string {
  const resultTypes = analyzeResultTypes(toolResults);
  const intentAnalysis = extractQueryIntent(originalQuery);
  
  return `You are synthesizing tool results to answer a user's question. Your goal is to provide a helpful, contextually appropriate response.

**USER'S ORIGINAL QUESTION:** "${originalQuery}"

**INTENT ANALYSIS:**
${intentAnalysis}

**DATA RETRIEVED:**
${formatRetrievedDataSummary(toolResults, resultTypes)}

**SYNTHESIS INSTRUCTIONS:**

1. **Address Intent-Data Gaps:** If the retrieved data doesn't directly match what the user asked for, acknowledge this and explain what was found instead.

2. **Provide Context:** Help the user understand why certain data was retrieved and how it relates to their query.

3. **Offer Alternatives:** If exact matches aren't available, suggest related information or alternative approaches.

4. **Be Helpful:** Even if the data doesn't perfectly match the request, extract maximum value and provide actionable insights.

5. **Maintain Honesty:** If no relevant data was found, say so clearly and suggest next steps.

**RESPONSE GUIDELINES:**
- Start by directly addressing the user's question
- If data doesn't match the intent, explain the mismatch helpfully
- Provide the most relevant information available
- Suggest follow-up actions when appropriate
- Keep the tone conversational and helpful

Generate a comprehensive response that bridges the gap between user intent and available data.`;
}

/**
 * Extracts semantic intent from user queries without hardcoding specific patterns
 */
function extractQueryIntent(query: string): string {
  const intentClues = [];
  
  // Temporal indicators
  if (/latest|recent|new|current|today|this week/i.test(query)) {
    intentClues.push("User wants recent/current information");
  }
  
  // Action indicators
  if (/list|show|find|get|retrieve/i.test(query)) {
    intentClues.push("User wants to see a list or collection of items");
  }
  
  // Specificity indicators
  if (/across|all|different|multiple/i.test(query)) {
    intentClues.push("User wants comprehensive coverage across multiple sources");
  }
  
  // Entity extraction (generic patterns)
  const entities = query.match(/\b(epics?|tasks?|issues?|bugs?|stories?|projects?)\b/gi);
  if (entities && entities.length > 0) {
    intentClues.push(`User is specifically interested in: ${entities.join(', ')}`);
  }
  
  return intentClues.length > 0 
    ? intentClues.join('\n- ')
    : "General information request";
}

/**
 * Analyzes the types and structure of retrieved data
 */
function analyzeResultTypes(toolResults: any[]): {
  hasLists: boolean;
  hasSingleItems: boolean;
  hasEmptyResults: boolean;
  dataTypes: string[];
  totalItems: number;
} {
  let hasLists = false;
  let hasSingleItems = false;
  let hasEmptyResults = false;
  const dataTypes: string[] = [];
  let totalItems = 0;
  
  toolResults.forEach(result => {
    if (result.result) {
      if (Array.isArray(result.result)) {
        if (result.result.length === 0) {
          hasEmptyResults = true;
        } else if (result.result.length === 1) {
          hasSingleItems = true;
          totalItems += 1;
        } else {
          hasLists = true;
          totalItems += result.result.length;
        }
      } else if (typeof result.result === 'object') {
        if (result.result.issues && Array.isArray(result.result.issues)) {
          if (result.result.issues.length > 0) {
            hasLists = true;
            totalItems += result.result.issues.length;
            dataTypes.push('Jira issues');
          } else {
            hasEmptyResults = true;
          }
        } else if (result.result.total !== undefined) {
          dataTypes.push('paginated data');
        } else {
          hasSingleItems = true;
          totalItems += 1;
        }
      }
    }
    
    // Add tool type context
    if (result.name) {
      dataTypes.push(result.name.replace('execute_', '').replace('-', ' '));
    }
  });
  
  return {
    hasLists,
    hasSingleItems,
    hasEmptyResults,
    dataTypes: [...new Set(dataTypes)],
    totalItems
  };
}

/**
 * Creates a summary of what data was actually retrieved
 */
function formatRetrievedDataSummary(toolResults: any[], resultTypes: any): string {
  const summary = [];
  
  summary.push(`- Total tools used: ${toolResults.length}`);
  summary.push(`- Total items retrieved: ${resultTypes.totalItems}`);
  summary.push(`- Data sources: ${resultTypes.dataTypes.join(', ')}`);
  
  if (resultTypes.hasEmptyResults) {
    summary.push("- Some searches returned no results");
  }
  
  if (resultTypes.hasLists) {
    summary.push("- Multiple items found in some categories");
  }
  
  return summary.join('\n');
}

/**
 * Enhanced synthesis for iterative results with intent analysis
 */
export async function synthesizeIterativeResultsEnhanced(
  originalQuery: string,
  accumulatedContext: any[],
  finalResponse: string,
  supabase: any
): Promise<string> {
  const toolResults = accumulatedContext.flatMap(ctx => ctx.toolsUsed || []);
  const synthesisPrompt = generateIntentAwareSynthesisPrompt(originalQuery, toolResults, accumulatedContext);
  
  const messages = [
    {
      role: 'system',
      content: synthesisPrompt
    },
    {
      role: 'user',
      content: `Please synthesize the following information to answer the user's question:

Original Query: "${originalQuery}"

Tool Results Summary:
${accumulatedContext.map((ctx, i) => 
  `Iteration ${i + 1}: ${ctx.response}\nTools: ${ctx.toolsUsed?.map(t => t.name).join(', ') || 'none'}`
).join('\n\n')}

Final AI Response: "${finalResponse}"

Provide a comprehensive, helpful response that addresses the user's intent.`
    }
  ];

  try {
    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages,
        temperature: 0.3,
        max_tokens: 800
      }
    });

    if (response.error) {
      console.error('Error in enhanced synthesis:', response.error);
      return finalResponse; // Fallback to original response
    }

    const synthesizedResponse = response.data?.choices?.[0]?.message?.content;
    return synthesizedResponse || finalResponse;
    
  } catch (error) {
    console.error('Error in synthesizeIterativeResultsEnhanced:', error);
    return finalResponse; // Fallback to original response
  }
}

/**
 * Enhanced synthesis for direct tool results
 */
export async function synthesizeToolResultsEnhanced(
  originalQuery: string,
  toolResults: any[],
  supabase: any
): Promise<string> {
  const synthesisPrompt = generateIntentAwareSynthesisPrompt(originalQuery, toolResults);
  
  const messages = [
    {
      role: 'system',
      content: synthesisPrompt
    },
    {
      role: 'user',
      content: `Synthesize the following tool results to answer: "${originalQuery}"

Tool Results:
${toolResults.map(tool => 
  `${tool.name}: ${JSON.stringify(tool.result, null, 2)}`
).join('\n\n')}

Provide a helpful response that addresses the user's intent, even if the data doesn't exactly match what they asked for.`
    }
  ];

  try {
    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages,
        temperature: 0.3,
        max_tokens: 600
      }
    });

    if (response.error) {
      console.error('Error in enhanced tool synthesis:', response.error);
      return `I found information from ${toolResults.length} source(s), but encountered an error synthesizing the results.`;
    }

    const synthesizedResponse = response.data?.choices?.[0]?.message?.content;
    return synthesizedResponse || `I retrieved data from ${toolResults.length} tool(s) but couldn't synthesize a clear response.`;
    
  } catch (error) {
    console.error('Error in synthesizeToolResultsEnhanced:', error);
    return `I found information from ${toolResults.length} source(s), but encountered an error processing the results.`;
  }
}
