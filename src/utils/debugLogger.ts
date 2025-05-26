
interface DebugEventDetail {
  type: 'complexity' | 'tool' | 'knowledge' | 'error' | 'info';
  message: string;
  data?: any;
}

export const emitDebugLog = (detail: DebugEventDetail) => {
  const event = new CustomEvent('debugLog', { detail });
  window.dispatchEvent(event);
  
  // Also log to console for development
  console.log(`[DEBUG ${detail.type.toUpperCase()}]`, detail.message, detail.data);
};

export const debugComplexity = (query: string, decision: any) => {
  emitDebugLog({
    type: 'complexity',
    message: `Query "${query}" classified as ${decision.classification} (${Math.round(decision.confidence * 100)}% confidence)`,
    data: decision
  });
};

export const debugTool = (toolName: string, success: boolean, result?: any) => {
  emitDebugLog({
    type: 'tool',
    message: `Tool ${toolName} ${success ? 'succeeded' : 'failed'}`,
    data: { toolName, success, result }
  });
};

export const debugKnowledge = (action: string, details: any) => {
  emitDebugLog({
    type: 'knowledge',
    message: `Knowledge ${action}`,
    data: details
  });
};

export const debugError = (error: string, context?: any) => {
  emitDebugLog({
    type: 'error',
    message: error,
    data: context
  });
};
