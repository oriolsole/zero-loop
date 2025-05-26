
import { useState, useCallback } from 'react';
import { EnhancedToolDecision } from '@/components/knowledge/EnhancedToolDecision';

export interface UseEnhancedToolDecisionReturn {
  toolDecision: EnhancedToolDecision | null;
  currentStep: number;
  isExecuting: boolean;
  analyzeRequest: (message: string) => EnhancedToolDecision;
  startExecution: () => void;
  nextStep: () => void;
  completeExecution: () => void;
  resetDecision: () => void;
}

export const useEnhancedToolDecision = (): UseEnhancedToolDecisionReturn => {
  const [toolDecision, setToolDecision] = useState<EnhancedToolDecision | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);

  const analyzeRequest = useCallback((message: string): EnhancedToolDecision => {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced pattern recognition
    const githubPatterns = [
      /github\.com\/[\w-]+\/[\w-]+/i,
      /\b(github|repository|repo|pull request|pr|commit|branch)\b/i,
      /\b(analyze|examine|look at|check|review).*(repository|repo|github|code)/i,
      /\b(clone|fork|star|watch|issue|releases?)\b/i
    ];
    
    const searchPatterns = [
      /\b(search|find|look up|lookup|google|bing)\b/i,
      /\b(information about|tell me about|what is|who is|how to)\b/i,
      /\b(latest|current|recent|new|today).*(news|information|data|updates?)\b/i,
      /\b(tutorial|guide|example|documentation|docs)\b/i,
      /\b(price|cost|rate|stock|market|weather|news)\b/i
    ];
    
    const knowledgePatterns = [
      /\b(my knowledge|knowledge base|my notes|my documents|remember|recall)\b/i,
      /\b(search my|find in my|look in my|stored|saved)\b/i,
      /\b(previous|earlier|before|history|conversation)\b/i
    ];

    // Complexity assessment
    const complexityIndicators = {
      simple: [/\b(what is|who is|simple|quick|brief)\b/i],
      moderate: [/\b(explain|describe|compare|analyze)\b/i],
      complex: [/\b(comprehensive|detailed|in-depth|thorough|complete)\b/i, /\band\b.*\band\b/i]
    };

    let detectedType: EnhancedToolDecision['detectedType'] = 'general';
    let shouldUseTools = false;
    let reasoning = '';
    let suggestedTools: string[] = [];
    let confidence = 0.6;
    let complexity: EnhancedToolDecision['complexity'] = 'simple';
    let estimatedSteps = 1;
    let fallbackStrategy: string | undefined;

    // Determine complexity
    if (complexityIndicators.complex.some(pattern => pattern.test(message))) {
      complexity = 'complex';
      estimatedSteps = 4;
    } else if (complexityIndicators.moderate.some(pattern => pattern.test(message))) {
      complexity = 'moderate';
      estimatedSteps = 2;
    }

    // GitHub detection
    if (githubPatterns.some(pattern => pattern.test(message))) {
      detectedType = 'github';
      shouldUseTools = true;
      reasoning = 'GitHub repository or code-related request detected - requires GitHub tools for repository analysis';
      suggestedTools = ['execute_github-tools'];
      confidence = 0.9;
      fallbackStrategy = 'If GitHub token is missing, provide general guidance about GitHub workflows';
    }
    // Knowledge base detection
    else if (knowledgePatterns.some(pattern => pattern.test(message))) {
      detectedType = 'knowledge';
      shouldUseTools = true;
      reasoning = 'Knowledge base query detected - requires search through stored documents and conversations';
      suggestedTools = ['execute_knowledge-search-v2'];
      confidence = 0.85;
      fallbackStrategy = 'If no results found, suggest alternative search terms or approaches';
    }
    // Web search detection
    else if (searchPatterns.some(pattern => pattern.test(message))) {
      detectedType = 'search';
      shouldUseTools = true;
      reasoning = 'Information search query detected - requires web search and/or knowledge base search';
      suggestedTools = ['execute_web-search', 'execute_knowledge-search-v2'];
      confidence = 0.8;
      fallbackStrategy = 'If web search fails, try knowledge base search or provide general guidance';
    }
    // Current information patterns
    else if (/\b(latest|current|recent|today|now|2024|2025)\b/i.test(message)) {
      detectedType = 'search';
      shouldUseTools = true;
      reasoning = 'Query about current information detected - requires web search for up-to-date data';
      suggestedTools = ['execute_web-search'];
      confidence = 0.75;
      fallbackStrategy = 'If current data unavailable, provide last known information with timestamp';
    }
    // General conversation
    else {
      detectedType = 'general';
      shouldUseTools = false;
      reasoning = 'General conversation or question - can be answered without external tools';
      suggestedTools = [];
      confidence = 0.7;
      estimatedSteps = 1;
    }

    // Adjust steps based on tools
    if (shouldUseTools) {
      estimatedSteps = Math.max(estimatedSteps, suggestedTools.length + 1); // +1 for analysis
    }

    const decision: EnhancedToolDecision = {
      shouldUseTools,
      detectedType,
      reasoning,
      confidence,
      suggestedTools,
      complexity,
      estimatedSteps,
      fallbackStrategy
    };

    setToolDecision(decision);
    return decision;
  }, []);

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

  return {
    toolDecision,
    currentStep,
    isExecuting,
    analyzeRequest,
    startExecution,
    nextStep,
    completeExecution,
    resetDecision
  };
};
