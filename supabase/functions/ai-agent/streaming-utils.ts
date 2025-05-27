
/**
 * Streaming utilities for progressive chat flow
 */

export interface StreamStep {
  id: string;
  type: 'step-announcement' | 'partial-result' | 'tool-announcement' | 'tool-status' | 'thinking';
  role: 'assistant';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolAction?: string;
}

/**
 * Create a streaming step message
 */
export function createStreamStep(
  type: StreamStep['type'],
  content: string,
  toolName?: string,
  toolAction?: string
): StreamStep {
  return {
    id: `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    role: 'assistant',
    content,
    timestamp: new Date(),
    toolName,
    toolAction
  };
}

/**
 * Format tool announcement
 */
export function createToolAnnouncement(toolName: string, action: string): StreamStep {
  const toolDisplayNames: Record<string, string> = {
    'web-search': 'Web Search',
    'knowledge-search': 'Knowledge Search',
    'github-tools': 'GitHub Tools',
    'jira-tools': 'Jira Tools',
    'web-scraper': 'Web Scraper'
  };

  const displayName = toolDisplayNames[toolName] || toolName;
  
  return createStreamStep(
    'tool-announcement',
    `🛠️ ${displayName} | ${action}`,
    toolName,
    action
  );
}

/**
 * Create step announcement with contextual phrasing
 */
export function createStepAnnouncement(intention: string): StreamStep {
  const phrases = [
    "Let me check",
    "I'll look into",
    "Let me search for",
    "I'll analyze",
    "Let me find out",
    "I'll gather information about"
  ];
  
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  const content = `${randomPhrase} ${intention}...`;
  
  return createStreamStep('step-announcement', content);
}

/**
 * Create result-based transitions
 */
export function createResultTransition(resultContext: string, nextAction: string): StreamStep {
  const transitions = [
    `Now that I have ${resultContext}, let me ${nextAction}...`,
    `Based on ${resultContext}, I'll ${nextAction}...`,
    `With ${resultContext}, let me also ${nextAction}...`,
    `Given ${resultContext}, I should ${nextAction}...`
  ];
  
  const randomTransition = transitions[Math.floor(Math.random() * transitions.length)];
  
  return createStreamStep('step-announcement', randomTransition);
}

/**
 * Format partial results with visual indicators
 */
export function createPartialResult(result: any, context?: string): StreamStep {
  let content = '';
  
  if (typeof result === 'object' && result !== null) {
    if (Array.isArray(result)) {
      content = `✅ Found ${result.length} ${context || 'results'}`;
    } else if (result.count !== undefined) {
      content = `✅ Found ${result.count} ${context || 'items'}`;
    } else if (result.total !== undefined) {
      content = `✅ Found ${result.total} ${context || 'items'}`;
    } else {
      content = `✅ Retrieved ${context || 'data'} successfully`;
    }
  } else if (typeof result === 'string') {
    content = `✅ ${result}`;
  } else {
    content = `✅ Operation completed ${context ? `for ${context}` : ''}`;
  }
  
  return createStreamStep('partial-result', content);
}
