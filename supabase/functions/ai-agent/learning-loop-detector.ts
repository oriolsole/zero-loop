
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

    // First check heuristic fallback rules for forced COMPLEX classification
    const heuristicDecision = checkHeuristicComplexity(message);
    if (heuristicDecision) {
      console.log('Heuristic classification triggered:', heuristicDecision);
      return heuristicDecision;
    }

    // Prepare context from conversation history
    const recentContext = conversationHistory
      .slice(-3) // Last 3 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const classificationPrompt = `You are an AI reasoning engine. Classify the complexity of the following user query.

SIMPLE: A direct answer using general knowledge is sufficient. No external data needed.
COMPLEX: The task requires current/real-time information, multiple steps, reasoning, tool chaining, or synthesis from external sources.

Key Classification Rules:
1. If answering requires UP-TO-DATE, FACTUAL, or EXTERNAL data → COMPLEX
2. If the query asks about current events, news, recent developments → COMPLEX  
3. If the query mentions specific years (especially current/recent years) → COMPLEX
4. If synthesis from multiple sources would improve the answer → COMPLEX

Examples:
"What's the capital of France?" → SIMPLE (static knowledge)
"Summarize today's top tech news" → COMPLEX (requires real-time data)
"What is GPT-4?" → SIMPLE (general knowledge)
"What are the biggest M&A deals of 2025?" → COMPLEX (requires current web search and synthesis)
"Tell me about major news stories in 2025" → COMPLEX (requires current news data and synthesis)
"How to stay updated on news?" → SIMPLE (general advice)
"Latest developments in AI" → COMPLEX (requires current information)

Consider:
- Does this need current/real-time information?
- Would web search significantly improve the answer?
- Does it require synthesis from multiple current sources?
- Is it asking about events in recent years (2024, 2025)?

Recent conversation context:
${recentContext || 'No prior context'}

Current query: "${message}"

Respond in JSON format:
{
  "classification": "SIMPLE" or "COMPLEX",
  "reasoning": "Brief explanation focusing on why external data is/isn't needed",
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
      
      // Safety net validator: Double-check SIMPLE responses for missed complexity
      if (decision.classification === 'SIMPLE') {
        const safetyCheck = validateSimpleResponse(message);
        if (safetyCheck.shouldOverride) {
          console.log('Safety net triggered - overriding to COMPLEX:', safetyCheck.reason);
          return {
            classification: 'COMPLEX',
            reasoning: `Safety net override: ${safetyCheck.reason}`,
            confidence: 0.8
          };
        }
      }
      
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
 * Heuristic rules that force COMPLEX classification for certain patterns
 */
function checkHeuristicComplexity(message: string): ComplexityDecision | null {
  const lowerMessage = message.toLowerCase();
  
  // Time-sensitive keywords that always need external data
  const timeSensitiveKeywords = [
    '2024', '2025', // Current/recent years
    'today', 'recent', 'latest', 'current', 'now',
    'breaking', 'headlines', 'news stories',
    'this year', 'this month', 'this week'
  ];
  
  // News and current events patterns
  const newsPatterns = [
    /\b(news|headlines|breaking|current events)\b/i,
    /\bmajor.*stories\b/i,
    /\btop.*news\b/i,
    /\blatest.*developments\b/i
  ];
  
  // Market/financial data patterns (always current)
  const marketPatterns = [
    /\b(stock|market|price|trading|deals|acquisitions)\b/i,
    /\bm&a deals\b/i,
    /\bstock market\b/i
  ];
  
  // Check for time-sensitive keywords
  if (timeSensitiveKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return {
      classification: 'COMPLEX',
      reasoning: 'Query contains time-sensitive keywords requiring current data',
      confidence: 0.9
    };
  }
  
  // Check for news patterns
  if (newsPatterns.some(pattern => pattern.test(message))) {
    return {
      classification: 'COMPLEX',
      reasoning: 'News query detected - requires real-time information gathering',
      confidence: 0.9
    };
  }
  
  // Check for market/financial patterns
  if (marketPatterns.some(pattern => pattern.test(message))) {
    return {
      classification: 'COMPLEX',
      reasoning: 'Financial/market query detected - requires current data',
      confidence: 0.85
    };
  }
  
  return null;
}

/**
 * Safety net validator to catch missed complexity in SIMPLE classifications
 */
function validateSimpleResponse(message: string): { shouldOverride: boolean; reason?: string } {
  const lowerMessage = message.toLowerCase();
  
  // Patterns that should have been COMPLEX but might be missed
  const missedComplexityPatterns = [
    { pattern: /what.*happening.*world/i, reason: 'Global current events query' },
    { pattern: /tell me about.*in 202[4-5]/i, reason: 'Recent year-specific query' },
    { pattern: /summarize.*today/i, reason: 'Today-specific summary request' },
    { pattern: /major.*events.*202[4-5]/i, reason: 'Recent major events query' },
    { pattern: /biggest.*202[4-5]/i, reason: 'Recent superlatives query' }
  ];
  
  for (const { pattern, reason } of missedComplexityPatterns) {
    if (pattern.test(message)) {
      return { shouldOverride: true, reason };
    }
  }
  
  // Check for implicit current information needs
  if (lowerMessage.includes('what are') && (lowerMessage.includes('news') || lowerMessage.includes('stories'))) {
    return { shouldOverride: true, reason: 'Implicit current news request' };
  }
  
  return { shouldOverride: false };
}

/**
 * Determine if learning loop should be used based on AI classification
 */
export function shouldUseLearningLoop(decision: ComplexityDecision): boolean {
  return decision.classification === 'COMPLEX';
}

/**
 * Enhanced fallback classification with better time-sensitive detection
 */
function fallbackClassification(message: string): ComplexityDecision {
  console.log('Using enhanced fallback classification');
  
  const lowerMessage = message.toLowerCase();
  
  // Enhanced heuristics for fallback
  const wordCount = message.split(/\s+/).length;
  const hasMultipleQuestions = (message.match(/\?/g) || []).length > 1;
  
  // Time-sensitive indicators
  const timeSensitiveWords = ['2024', '2025', 'today', 'recent', 'latest', 'current', 'news', 'breaking'];
  const hasTimeSensitive = timeSensitiveWords.some(word => lowerMessage.includes(word));
  
  // Complex task indicators
  const complexKeywords = /\b(compare|analyze|research|investigate|strategy|comprehensive|detailed|summarize|synthesis)\b/i.test(message);
  
  // News and current events indicators
  const newsKeywords = /\b(news|headlines|stories|events|developments|trends)\b/i.test(message);
  
  const isComplex = hasTimeSensitive || 
                    newsKeywords || 
                    wordCount > 30 || 
                    hasMultipleQuestions || 
                    complexKeywords;
  
  return {
    classification: isComplex ? 'COMPLEX' : 'SIMPLE',
    reasoning: isComplex 
      ? 'Enhanced fallback: detected time-sensitive or complex query patterns'
      : 'Enhanced fallback: appears to be simple general knowledge query',
    confidence: 0.6
  };
}
