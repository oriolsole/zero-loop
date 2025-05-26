
/**
 * Simplified AI-Powered Learning Loop Detection
 * Uses LLM reasoning with minimal fallback
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
    console.log('AI classifying query complexity:', message);

    // Prepare context from conversation history
    const recentContext = conversationHistory
      .slice(-3) // Last 3 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const classificationPrompt = `You are a query complexity classifier for an AI agent system.

Classify this query as either SIMPLE or COMPLEX:

SIMPLE: Can be answered with general knowledge, no external data needed
COMPLEX: Requires current/real-time information, web search, multiple tools, or multi-step reasoning

Key indicators for COMPLEX:
- Current events, news, recent developments
- Time-sensitive queries (2024, 2025, "today", "latest", "recent")
- Requests for up-to-date information
- Multi-step research or analysis tasks
- Queries that would benefit from web search or external tools

Examples:
"What's the capital of France?" → SIMPLE
"Latest AI developments in 2025" → COMPLEX
"How to learn programming?" → SIMPLE  
"Major news stories today" → COMPLEX
"What are the biggest M&A deals of 2025?" → COMPLEX

Recent conversation context:
${recentContext || 'No prior context'}

Query to classify: "${message}"

Respond with JSON only:
{
  "classification": "SIMPLE" or "COMPLEX",
  "reasoning": "Brief explanation of your decision",
  "confidence": 0.0-1.0
}`;

    // Call AI model for classification
    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [
          {
            role: 'system',
            content: classificationPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
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
      return minimalFallback(message);
    }

    const classificationMessage = response.data?.choices?.[0]?.message?.content;
    if (!classificationMessage) {
      console.error('No classification response received');
      return minimalFallback(message);
    }

    try {
      // Extract JSON from response
      const cleanedResponse = extractJSONFromResponse(classificationMessage);
      const decision = JSON.parse(cleanedResponse);
      
      // Validate the response
      if (!decision.classification || !['SIMPLE', 'COMPLEX'].includes(decision.classification)) {
        console.error('Invalid classification response:', decision);
        return minimalFallback(message);
      }

      console.log('AI complexity decision:', decision);
      
      return {
        classification: decision.classification,
        reasoning: decision.reasoning || 'No reasoning provided',
        confidence: Math.min(Math.max(decision.confidence || 0.7, 0), 1)
      };

    } catch (parseError) {
      console.error('Error parsing classification JSON:', parseError);
      return minimalFallback(message);
    }

  } catch (error) {
    console.error('Error in detectQueryComplexity:', error);
    return minimalFallback(message);
  }
}

/**
 * Extract JSON from various response formats
 */
function extractJSONFromResponse(content: string): string {
  if (!content) throw new Error('No content provided');

  // Strategy 1: Try direct JSON parsing
  try {
    JSON.parse(content);
    return content;
  } catch (e) {
    // Continue to other strategies
  }

  // Strategy 2: Extract from markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;
  const codeBlockMatch = content.match(codeBlockRegex);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  // Strategy 3: Find JSON-like content between curly braces
  const jsonRegex = /\{[\s\S]*\}/;
  const jsonMatch = content.match(jsonRegex);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // Strategy 4: Clean up common formatting issues
  const cleaned = content
    .replace(/^\s*```(?:json)?\s*/i, '') // Remove starting markdown
    .replace(/\s*```\s*$/, '') // Remove ending markdown
    .replace(/^[^{]*(\{)/, '$1') // Remove text before first {
    .replace(/(\})[^}]*$/, '$1') // Remove text after last }
    .trim();
  
  return cleaned;
}

/**
 * Minimal fallback for when AI classification fails
 * Only uses basic time-sensitive keyword detection
 */
function minimalFallback(message: string): ComplexityDecision {
  console.log('Using minimal fallback classification');
  
  const lowerMessage = message.toLowerCase();
  
  // Only check for clear time-sensitive indicators
  const timeSensitiveKeywords = ['2024', '2025', 'today', 'latest', 'recent', 'current', 'news'];
  const hasTimeSensitive = timeSensitiveKeywords.some(keyword => lowerMessage.includes(keyword));
  
  return {
    classification: hasTimeSensitive ? 'COMPLEX' : 'SIMPLE',
    reasoning: hasTimeSensitive 
      ? 'Fallback: detected time-sensitive keywords'
      : 'Fallback: appears to be general knowledge query',
    confidence: 0.6
  };
}

/**
 * Determine if learning loop should be used based on AI classification
 */
export function shouldUseLearningLoop(decision: ComplexityDecision): boolean {
  return decision.classification === 'COMPLEX';
}
