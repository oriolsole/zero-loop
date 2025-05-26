
/**
 * Learning Loop Detection and Complexity Analysis
 */

export interface ComplexityAnalysis {
  complexity: 'simple' | 'moderate' | 'complex';
  confidence: number;
  suggestedApproach: string;
  requiredSteps?: string[];
  estimatedIterations: number;
  reasoning: string;
}

/**
 * Detect if a query requires learning loop integration
 */
export async function detectComplexQuery(
  message: string,
  conversationHistory: any[] = []
): Promise<ComplexityAnalysis> {
  const lowerMessage = message.toLowerCase();
  
  // Simple pattern-based detection
  const complexityIndicators = {
    simple: [
      'what is', 'define', 'explain briefly', 'quick question',
      'hello', 'hi', 'thanks', 'thank you'
    ],
    moderate: [
      'compare', 'analyze', 'research', 'find information about',
      'tell me about', 'how does', 'what are the benefits'
    ],
    complex: [
      'comprehensive analysis', 'deep dive', 'complete overview',
      'research and compare', 'analyze trends', 'investigate',
      'build a strategy', 'create a plan', 'synthesize information',
      'multi-step', 'detailed research', 'thorough investigation'
    ]
  };

  // Multi-tool indicators
  const multiToolIndicators = [
    'search and analyze', 'compare multiple', 'research different',
    'find latest and compare', 'analyze trends over time',
    'investigate and report', 'comprehensive research'
  ];

  // Question complexity indicators
  const hasMultipleQuestions = (message.match(/\?/g) || []).length > 1;
  const hasComplexConjunctions = /\b(and then|after that|subsequently|furthermore|moreover|additionally)\b/i.test(message);
  const hasTimeComparisons = /\b(compare.*over time|trend|historical|evolution|changes|development)\b/i.test(message);
  const hasMultipleEntities = /\b(compare.*between|versus|vs|against|different.*approaches)\b/i.test(message);

  // Calculate base complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  let confidence = 0.5;
  let reasoning = '';

  // Check for complex indicators
  if (complexityIndicators.complex.some(indicator => lowerMessage.includes(indicator))) {
    complexity = 'complex';
    confidence = 0.8;
    reasoning = 'Contains complex analysis keywords';
  } else if (multiToolIndicators.some(indicator => lowerMessage.includes(indicator))) {
    complexity = 'complex';
    confidence = 0.9;
    reasoning = 'Requires multiple tool coordination';
  } else if (complexityIndicators.moderate.some(indicator => lowerMessage.includes(indicator))) {
    complexity = 'moderate';
    confidence = 0.7;
    reasoning = 'Contains moderate complexity keywords';
  }

  // Upgrade complexity based on structural indicators
  if (hasMultipleQuestions || hasComplexConjunctions || hasTimeComparisons || hasMultipleEntities) {
    if (complexity === 'simple') {
      complexity = 'moderate';
      confidence = Math.max(confidence, 0.6);
      reasoning += '; Complex question structure detected';
    } else if (complexity === 'moderate') {
      complexity = 'complex';
      confidence = Math.max(confidence, 0.8);
      reasoning += '; Multiple complexity factors detected';
    }
  }

  // Message length consideration
  const wordCount = message.split(/\s+/).length;
  if (wordCount > 50) {
    if (complexity === 'simple') {
      complexity = 'moderate';
      confidence = Math.max(confidence, 0.6);
      reasoning += '; Long query suggests complexity';
    }
  }

  // Conversation history consideration
  const hasContext = conversationHistory.length > 2;
  if (hasContext && complexity !== 'simple') {
    confidence = Math.min(confidence + 0.1, 0.95);
    reasoning += '; Conversation context adds complexity';
  }

  // Generate suggested approach and steps
  const suggestedApproach = generateApproach(complexity, message);
  const requiredSteps = generateRequiredSteps(complexity, message);
  const estimatedIterations = estimateIterations(complexity, requiredSteps);

  return {
    complexity,
    confidence,
    suggestedApproach,
    requiredSteps,
    estimatedIterations,
    reasoning
  };
}

/**
 * Determine if learning loop should be used based on complexity analysis
 */
export function shouldUseLearningLoop(analysis: ComplexityAnalysis): boolean {
  // Use learning loop for complex queries or moderate queries with high confidence
  if (analysis.complexity === 'complex') {
    return true;
  }
  
  if (analysis.complexity === 'moderate' && analysis.confidence > 0.7) {
    return true;
  }

  // Use learning loop if estimated iterations > 1
  if (analysis.estimatedIterations > 1) {
    return true;
  }

  return false;
}

/**
 * Generate suggested approach based on complexity
 */
function generateApproach(complexity: string, message: string): string {
  const lowerMessage = message.toLowerCase();
  
  switch (complexity) {
    case 'complex':
      if (lowerMessage.includes('compare') || lowerMessage.includes('analyze')) {
        return 'Multi-step research and comparative analysis';
      } else if (lowerMessage.includes('strategy') || lowerMessage.includes('plan')) {
        return 'Strategic planning with research and synthesis';
      } else {
        return 'Comprehensive research with iterative refinement';
      }
    
    case 'moderate':
      if (lowerMessage.includes('research')) {
        return 'Focused research with synthesis';
      } else {
        return 'Multi-source information gathering';
      }
    
    default:
      return 'Direct response with minimal tool usage';
  }
}

/**
 * Generate required steps based on complexity and message content
 */
function generateRequiredSteps(complexity: string, message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const steps: string[] = [];

  if (complexity === 'simple') {
    steps.push('Direct response or single tool usage');
    return steps;
  }

  // Research step
  if (lowerMessage.includes('research') || lowerMessage.includes('find') || lowerMessage.includes('search')) {
    steps.push('Research and information gathering');
  }

  // Analysis step
  if (lowerMessage.includes('analyze') || lowerMessage.includes('compare') || lowerMessage.includes('evaluate')) {
    steps.push('Analysis and comparison');
  }

  // Synthesis step for complex queries
  if (complexity === 'complex') {
    steps.push('Synthesis and insight generation');
  }

  // Strategy/planning step
  if (lowerMessage.includes('strategy') || lowerMessage.includes('plan') || lowerMessage.includes('recommend')) {
    steps.push('Strategic planning and recommendations');
  }

  // Default steps if none detected
  if (steps.length === 0) {
    if (complexity === 'moderate') {
      steps.push('Information gathering', 'Basic analysis');
    } else {
      steps.push('Comprehensive research', 'Analysis', 'Synthesis');
    }
  }

  return steps;
}

/**
 * Estimate number of iterations needed
 */
function estimateIterations(complexity: string, requiredSteps: string[]): number {
  switch (complexity) {
    case 'complex':
      return Math.min(Math.max(requiredSteps.length, 2), 4);
    case 'moderate':
      return Math.min(requiredSteps.length, 2);
    default:
      return 1;
  }
}
