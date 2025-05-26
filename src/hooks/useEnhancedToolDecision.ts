
import { useState, useCallback } from 'react';
import { EnhancedToolDecision } from '@/components/knowledge/EnhancedToolDecision';
import { usePlanDetector } from './usePlanDetector';
import { usePlanOrchestrator } from './usePlanOrchestrator';

export interface UseEnhancedToolDecisionReturn {
  toolDecision: EnhancedToolDecision | null;
  currentStep: number;
  isExecuting: boolean;
  currentPlan: any;
  planProgress: { current: number; total: number; percentage: number };
  analyzeRequest: (message: string, conversationHistory?: any[]) => EnhancedToolDecision;
  startExecution: () => void;
  nextStep: () => void;
  completeExecution: () => void;
  resetDecision: () => void;
  onStepUpdate: (step: any) => void;
  onPlanComplete: (result: string) => void;
}

export const useEnhancedToolDecision = (): UseEnhancedToolDecisionReturn => {
  const [toolDecision, setToolDecision] = useState<EnhancedToolDecision | null>(null);
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

  const analyzeRequest = useCallback((message: string, conversationHistory: any[] = []): EnhancedToolDecision => {
    const lowerMessage = message.toLowerCase();
    
    // First check if we should use multi-step planning
    const planDetection = detectPlan(message, conversationHistory);
    
    if (planDetection.shouldUsePlan) {
      const decision: EnhancedToolDecision = {
        shouldUseTools: true,
        detectedType: 'multi-step-plan',
        reasoning: planDetection.reasoning,
        confidence: planDetection.confidence,
        suggestedTools: ['multi-step-execution'],
        complexity: 'complex',
        estimatedSteps: planDetection.planType === 'news-search' ? 4 : planDetection.planType === 'repo-analysis' ? 4 : 3,
        fallbackStrategy: 'If plan execution fails, revert to single-step tool execution',
        planType: planDetection.planType,
        planContext: planDetection.context
      };
      
      setToolDecision(decision);
      return decision;
    }
    
    // Simplified tool decision logic - let the model decide naturally
    const decision = createSimpleToolDecision(message, conversationHistory);
    setToolDecision(decision);
    return decision;
  }, [detectPlan]);

  const createSimpleToolDecision = (message: string, conversationHistory: any[]): EnhancedToolDecision => {
    const lowerMessage = message.toLowerCase();
    
    // Simple intent detection - does this need external data/tools?
    const needsExternalData = requiresExternalTools(message);
    
    if (!needsExternalData) {
      return {
        shouldUseTools: false,
        detectedType: 'general',
        reasoning: 'This appears to be a general question that can be answered with existing knowledge',
        confidence: 0.8,
        suggestedTools: [],
        complexity: 'simple',
        estimatedSteps: 1
      };
    }

    // If external tools are needed, let the model decide which ones
    return {
      shouldUseTools: true,
      detectedType: 'general', // Let model decide specific type
      reasoning: 'This request may benefit from external tools - letting the model choose the most appropriate ones',
      confidence: 0.7,
      suggestedTools: [], // Don't pre-suggest tools, let model decide
      complexity: 'moderate',
      estimatedSteps: 2,
      fallbackStrategy: 'If no tools are used, provide response based on existing knowledge'
    };
  };

  const requiresExternalTools = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    
    // Very basic indicators that external data might be needed
    const externalDataIndicators = [
      'search', 'find', 'look up', 'current', 'latest', 'recent', 'today',
      'github', 'repository', 'repo', 'jira', 'knowledge base',
      'what is', 'who is', 'how to', 'analyze', 'check'
    ];
    
    // Simple conversational responses that don't need tools
    const conversationalPatterns = [
      'hello', 'hi', 'hey', 'thanks', 'thank you', 'good morning',
      'good afternoon', 'good evening', 'how are you', 'what can you do'
    ];
    
    // Check if it's clearly conversational
    if (conversationalPatterns.some(pattern => lowerMessage.includes(pattern))) {
      return false;
    }
    
    // Check if it might need external data
    return externalDataIndicators.some(indicator => lowerMessage.includes(indicator));
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
