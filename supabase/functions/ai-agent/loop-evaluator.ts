
import { extractAssistantMessage } from './response-handler.ts';

export const MAX_LOOPS = 2;

export interface LoopEvaluation {
  shouldContinue: boolean;
  reasoning: string;
}

/**
 * Evaluates whether the agent should continue improving its response
 */
export async function shouldContinueLoop(
  response: string,
  toolsUsed: any[],
  loopCount: number,
  originalMessage: string,
  supabase: any,
  modelSettings: any,
  loopEnabled: boolean = true // New parameter to control loop behavior
): Promise<LoopEvaluation> {
  // Don't continue if loops are disabled by user
  if (!loopEnabled) {
    return {
      shouldContinue: false,
      reasoning: 'Self-improvement loops are disabled by user preference'
    };
  }

  // Don't continue if we've reached max loops
  if (loopCount >= MAX_LOOPS) {
    return {
      shouldContinue: false,
      reasoning: `Maximum loop iterations (${MAX_LOOPS}) reached`
    };
  }

  // Don't continue if no response to evaluate
  if (!response || !response.trim()) {
    return {
      shouldContinue: false,
      reasoning: 'No response to evaluate'
    };
  }

  try {
    const evaluationPrompt = createEvaluationPrompt(response, toolsUsed, originalMessage);
    
    const evaluationResponse = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant evaluating whether a response can be improved. Respond with a JSON object containing "shouldContinue" (boolean) and "reasoning" (string).'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel,
          localModelUrl: modelSettings.localModelUrl
        })
      }
    });

    if (evaluationResponse.error) {
      console.warn('Loop evaluation failed:', evaluationResponse.error);
      return {
        shouldContinue: false,
        reasoning: 'Evaluation failed - proceeding with current response'
      };
    }

    const evaluationText = extractAssistantMessage(evaluationResponse.data);
    const evaluation = parseEvaluationResponse(evaluationText);
    
    console.log(`🔄 Loop ${loopCount + 1} evaluation:`, evaluation);
    return evaluation;

  } catch (error) {
    console.error('Error in loop evaluation:', error);
    return {
      shouldContinue: false,
      reasoning: 'Evaluation error - proceeding with current response'
    };
  }
}

/**
 * Creates the evaluation prompt for the self-improvement loop
 */
function createEvaluationPrompt(response: string, toolsUsed: any[], originalMessage: string): string {
  const toolsUsedSummary = toolsUsed.length > 0 
    ? toolsUsed.map(tool => `- ${tool.name}: ${tool.success ? 'Success' : 'Failed'}`).join('\n')
    : 'No tools were used';

  return `**Original User Request:**
"${originalMessage}"

**Current Response:**
${response}

**Tools Used:**
${toolsUsedSummary}

**Evaluation Task:**
Analyze if this response could be meaningfully improved by:
1. Using additional tools to gather more information
2. Providing more comprehensive analysis
3. Adding missing details or perspectives
4. Correcting any gaps or inaccuracies

Consider:
- Is the user's question fully answered?
- Would additional tool usage provide significant value?
- Are there obvious follow-up insights that would enhance the response?

Respond with JSON format:
{
  "shouldContinue": true/false,
  "reasoning": "Brief explanation of why improvement is/isn't worthwhile"
}`;
}

/**
 * Parses the evaluation response from the LLM
 */
function parseEvaluationResponse(evaluationText: string): LoopEvaluation {
  try {
    // Try to extract JSON from the response
    const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        shouldContinue: Boolean(parsed.shouldContinue),
        reasoning: String(parsed.reasoning || 'No reasoning provided')
      };
    }
  } catch (error) {
    console.warn('Failed to parse evaluation response:', error);
  }

  // Fallback heuristic based on keywords
  const shouldContinue = evaluationText.toLowerCase().includes('true') ||
                        evaluationText.toLowerCase().includes('improve') ||
                        evaluationText.toLowerCase().includes('additional');

  return {
    shouldContinue,
    reasoning: shouldContinue ? 
      'Basic heuristic suggests improvement possible' : 
      'Basic heuristic suggests response is sufficient'
  };
}
