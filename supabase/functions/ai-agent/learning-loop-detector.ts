
/**
 * AI-Powered Learning Loop Detection
 * Uses LLM reasoning instead of rigid pattern matching
 */

export interface ComplexityDecision {
  classification: 'SIMPLE' | 'COMPLEX';
  reasoning: string;
  confidence: number;
}

/**
 * Use AI to determine if a query requires learning loop integration
 */
export async function detectQueryComplexity(
  message: string,
  conversationHistory: any[] = [],
  supabase: any,
  modelSettings?: any
): Promise<ComplexityDecision> {
  try {
    console.log('Using AI to classify query complexity:', message);

    // Prepare context from conversation history
    const recentContext = conversationHistory
      .slice(-3) // Last 3 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const classificationPrompt = `You are an AI reasoning engine. Classify the complexity of the following user query.

SIMPLE: A direct answer using a single tool or simple response is sufficient.
COMPLEX: The task requires multiple steps, reasoning, tool chaining, or iterative analysis.

Consider:
- Does this need multiple information sources?
- Does it require analysis, comparison, or synthesis?
- Would breaking it into steps provide a better answer?
- Does it involve planning, strategy, or deep investigation?

Recent conversation context:
${recentContext || 'No prior context'}

Current query: "${message}"

Respond in JSON format:
{
  "classification": "SIMPLE" or "COMPLEX",
  "reasoning": "Brief explanation in one sentence",
  "confidence": 0.0-1.0
}`;

    const classificationMessages = [
      {
        role: 'system',
        content: classificationPrompt
      },
      {
        role: 'user',
        content: message
      }
    ];

    // Call AI model for classification
    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: classificationMessages,
        temperature: 0.1, // Low temperature for consistent classification
        max_tokens: 150,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel,
          localModelUrl: modelSettings.localModelUrl
        })
      }
    });

    if (response.error) {
      console.error('Error in AI complexity classification:', response.error);
      return fallbackClassification(message);
    }

    const classificationMessage = response.data?.choices?.[0]?.message?.content;
    if (!classificationMessage) {
      console.error('No classification response received');
      return fallbackClassification(message);
    }

    try {
      const decision = JSON.parse(classificationMessage);
      
      // Validate the response
      if (!decision.classification || !['SIMPLE', 'COMPLEX'].includes(decision.classification)) {
        console.error('Invalid classification response:', decision);
        return fallbackClassification(message);
      }

      console.log('AI complexity decision:', decision);
      return {
        classification: decision.classification,
        reasoning: decision.reasoning || 'No reasoning provided',
        confidence: Math.min(Math.max(decision.confidence || 0.5, 0), 1)
      };

    } catch (parseError) {
      console.error('Error parsing classification JSON:', parseError);
      return fallbackClassification(message);
    }

  } catch (error) {
    console.error('Error in detectQueryComplexity:', error);
    return fallbackClassification(message);
  }
}

/**
 * Determine if learning loop should be used based on AI classification
 */
export function shouldUseLearningLoop(decision: ComplexityDecision): boolean {
  return decision.classification === 'COMPLEX';
}

/**
 * Fallback classification for when AI classification fails
 */
function fallbackClassification(message: string): ComplexityDecision {
  console.log('Using fallback classification');
  
  // Simple heuristics as absolute fallback
  const wordCount = message.split(/\s+/).length;
  const hasMultipleQuestions = (message.match(/\?/g) || []).length > 1;
  const hasComplexKeywords = /\b(compare|analyze|research|investigate|strategy|comprehensive|detailed)\b/i.test(message);
  
  const isComplex = wordCount > 30 || hasMultipleQuestions || hasComplexKeywords;
  
  return {
    classification: isComplex ? 'COMPLEX' : 'SIMPLE',
    reasoning: 'Fallback classification due to AI classification failure',
    confidence: 0.6
  };
}
