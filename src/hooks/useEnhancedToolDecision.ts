
import { useState, useCallback } from 'react';
import { usePlanDetector } from './usePlanDetector';
import { usePlanOrchestrator } from './usePlanOrchestrator';

export interface SimpleToolDecision {
  shouldUseTools: boolean;
  detectedType: 'jira' | 'github' | 'search' | 'knowledge' | 'general';
  reasoning: string;
  confidence: number;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedSteps: number;
  fallbackStrategy?: string;
  planType?: string;
  planContext?: any;
}

export interface UseEnhancedToolDecisionReturn {
  toolDecision: SimpleToolDecision | null;
  currentStep: number;
  isExecuting: boolean;
  currentPlan: any;
  planProgress: { current: number; total: number; percentage: number };
  analyzeRequest: (message: string, conversationHistory?: any[]) => SimpleToolDecision;
  startExecution: () => void;
  nextStep: () => void;
  completeExecution: () => void;
  resetDecision: () => void;
  onStepUpdate: (step: any) => void;
  onPlanComplete: (result: string) => void;
}

export const useEnhancedToolDecision = (): UseEnhancedToolDecisionReturn => {
  const [toolDecision, setToolDecision] = useState<SimpleToolDecision | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const { detectPlan } = usePlanDetector();
  const { 
    currentPlan, 
    isExecuting: isPlanExecuting, 
    createPlan, 
    executePlan, 
    getProgress 
  } = usePlanOrchestrator();

  const analyzeRequest = useCallback((message: string, conversationHistory: any[] = []): SimpleToolDecision => {
    const lowerMessage = message.toLowerCase();
    
    // First check if we should use multi-step planning
    const planDetection = detectPlan(message, conversationHistory);
    
    if (planDetection.shouldUsePlan) {
      const decision: SimpleToolDecision = {
        shouldUseTools: true,
        detectedType: 'github', // Default for plans
        reasoning: planDetection.reasoning,
        confidence: planDetection.confidence,
        complexity: 'complex',
        estimatedSteps: planDetection.planType === 'news-search' ? 4 : planDetection.planType === 'repo-analysis' ? 4 : 3,
        fallbackStrategy: 'If plan execution fails, revert to single-step tool execution',
        planType: planDetection.planType,
        planContext: planDetection.context
      };
      
      setToolDecision(decision);
      return decision;
    }
    
    // Simplified tool decision logic for UI
    const decision = createSimpleToolDecision(message, conversationHistory);
    setToolDecision(decision);
    return decision;
  }, [detectPlan]);

  const createSimpleToolDecision = (message: string, conversationHistory: any[]): SimpleToolDecision => {
    const lowerMessage = message.toLowerCase();
    
    // Simple pattern matching for UI display
    if (lowerMessage.includes('jira') || 
        /\b(retrieve|list|get|show)\s+(projects?|my\s+projects?)\b/.test(lowerMessage) ||
        lowerMessage.includes('create ticket') || 
        lowerMessage.includes('search issues')) {
      return {
        shouldUseTools: true,
        detectedType: 'jira',
        reasoning: 'Detected Jira-related request',
        confidence: 0.8,
        complexity: 'simple',
        estimatedSteps: 1
      };
    }
    
    if (lowerMessage.includes('github') || 
        lowerMessage.includes('repository') || 
        lowerMessage.includes('repo') ||
        /github\.com\/[\w-]+\/[\w-]+/.test(message)) {
      return {
        shouldUseTools: true,
        detectedType: 'github', 
        reasoning: 'Detected GitHub repository request',
        confidence: 0.8,
        complexity: 'simple',
        estimatedSteps: 1
      };
    }
    
    if (/\b(search|find|look\s+up)\b/.test(lowerMessage) && 
        !/\b(my|personal|knowledge|documents?|notes?)\b/.test(lowerMessage)) {
      return {
        shouldUseTools: true,
        detectedType: 'search',
        reasoning: 'Detected web search request',
        confidence: 0.7,
        complexity: 'simple',
        estimatedSteps: 1
      };
    }
    
    if (/\b(my|personal|knowledge|documents?|notes?|saved?|uploaded?)\b/.test(lowerMessage)) {
      return {
        shouldUseTools: true,
        detectedType: 'knowledge',
        reasoning: 'Detected knowledge base search request', 
        confidence: 0.7,
        complexity: 'simple',
        estimatedSteps: 1
      };
    }
    
    return {
      shouldUseTools: false,
      detectedType: 'general',
      reasoning: 'General conversation - no tools needed',
      confidence: 0.8,
      complexity: 'simple',
      estimatedSteps: 1
    };
  };

  const startExecution = useCallback(() => {
    setIsExecuting(true);
    setCurrentStep(1);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  const completeExecution = useCallback(() => {
    setIsExecuting(false);
    if (toolDecision) {
      setCurrentStep(toolDecision.estimatedSteps);
    }
  }, [toolDecision]);

  const resetDecision = useCallback(() => {
    setToolDecision(null);
    setCurrentStep(0);
    setIsExecuting(false);
  }, []);

  const onStepUpdate = useCallback((step: any) => {
    console.log('Plan step updated:', step);
  }, []);

  const onPlanComplete = useCallback((result: string) => {
    console.log('Plan completed with result:', result);
    completeExecution();
  }, [completeExecution]);

  return {
    toolDecision,
    currentStep,
    isExecuting: isExecuting || isPlanExecuting,
    currentPlan,
    planProgress: getProgress(),
    analyzeRequest,
    startExecution,
    nextStep,
    completeExecution,
    resetDecision,
    onStepUpdate,
    onPlanComplete
  };
};
