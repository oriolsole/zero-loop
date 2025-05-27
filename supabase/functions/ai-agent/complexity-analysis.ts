
/**
 * Complexity Analysis Module
 * Determines if a query requires complex processing or simple handling
 */

export async function analyzeComplexity(
  message: string,
  conversationHistory: any[],
  openai: any,
  supabase: any
): Promise<{ classification: string; reasoning: string; confidence: number }> {
  try {
    // Simple heuristics for complexity classification
    const messageLength = message.length;
    const hasMultipleQuestions = (message.match(/\?/g) || []).length > 1;
    const hasComplexKeywords = /analyze|compare|research|investigate|explain in detail|comprehensive|thorough/i.test(message);
    const conversationLength = conversationHistory.length;

    // Determine complexity based on simple rules
    let classification = 'SIMPLE';
    let reasoning = 'Query appears straightforward and can be handled with existing knowledge.';
    let confidence = 0.8;

    if (messageLength > 200 || hasMultipleQuestions || hasComplexKeywords || conversationLength > 10) {
      classification = 'COMPLEX';
      reasoning = 'Query requires detailed analysis, research, or multi-step processing.';
      confidence = 0.9;
    }

    return {
      classification,
      reasoning,
      confidence
    };
  } catch (error) {
    console.error('Error in complexity analysis:', error);
    // Default to simple processing on error
    return {
      classification: 'SIMPLE',
      reasoning: 'Error in complexity analysis, defaulting to simple processing.',
      confidence: 0.5
    };
  }
}
