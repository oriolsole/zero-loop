
import { useState, useCallback } from 'react';

// Simplified version - just for basic UI state management
export interface SimpleToolDecision {
  shouldUseTools: boolean;
  detectedType: 'jira' | 'github' | 'search' | 'knowledge' | 'general';
  reasoning: string;
  confidence: number;
}

export interface UseEnhancedToolDecisionReturn {
  toolDecision: SimpleToolDecision | null;
  analyzeRequest: (message: string, conversationHistory?: any[]) => SimpleToolDecision;
  resetDecision: () => void;
}

export const useEnhancedToolDecision = (): UseEnhancedToolDecisionReturn => {
  const [toolDecision, setToolDecision] = useState<SimpleToolDecision | null>(null);

  const analyzeRequest = useCallback((message: string, conversationHistory: any[] = []): SimpleToolDecision => {
    // Simplified analysis for basic UI feedback only
    const decision: SimpleToolDecision = {
      shouldUseTools: false,
      detectedType: 'general',
      reasoning: 'Let me think about this...',
      confidence: 0.8
    };
    
    setToolDecision(decision);
    return decision;
  }, []);

  const resetDecision = useCallback(() => {
    setToolDecision(null);
  }, []);

  return {
    toolDecision,
    analyzeRequest,
    resetDecision
  };
};
