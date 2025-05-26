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
    
    // Fallback to original single-step analysis with enhanced scraping support
    const contextInfo = analyzeConversationContext(message, conversationHistory);
    
    const githubPatterns = [
      { pattern: /github\.com\/[\w-]+\/[\w-]+/i, weight: 1.0, context: 'direct_url' },
      { pattern: /\b(pull request|pr|merge|commit|branch|fork|clone)\b/i, weight: 0.9, context: 'git_workflow' },
      { pattern: /\b(analyze|examine|look at|check|review).*(repository|repo|github|code)/i, weight: 0.8, context: 'analysis_request' },
      { pattern: /\b(issue|releases?|contributors?|readme|documentation)\b/i, weight: 0.7, context: 'repo_content' },
      { pattern: /\b(file structure|directory structure|project structure|files|folders)\b/i, weight: 0.6, context: 'structure_query' }
    ];
    
    const searchPatterns = [
      { pattern: /\b(search|find|look up|lookup|google)\b/i, weight: 0.9, context: 'explicit_search' },
      { pattern: /\b(latest|current|recent|today|news)\b/i, weight: 0.8, context: 'current_info' },
      { pattern: /\b(what is|who is|how to|why does)\b/i, weight: 0.7, context: 'question' },
      { pattern: /\b(tutorial|guide|example|documentation)\b/i, weight: 0.6, context: 'learning' }
    ];
    
    const knowledgePatterns = [
      { pattern: /\b(my knowledge|knowledge base|my notes|remember)\b/i, weight: 1.0, context: 'personal_data' },
      { pattern: /\b(search my|find in my|look in my)\b/i, weight: 0.9, context: 'personal_search' },
      { pattern: /\b(previous|earlier|before|conversation|history)\b/i, weight: 0.8, context: 'conversation_history' },
      { pattern: /\b(stored|saved|documented|recorded)\b/i, weight: 0.7, context: 'stored_data' }
    ];

    // NEW: Web scraping specific patterns
    const scrapingPatterns = [
      { pattern: /https?:\/\/[^\s]+/g, weight: 1.0, context: 'direct_url' },
      { pattern: /\b(extract|scrape|get content|full article|detailed|comprehensive)\b/i, weight: 0.8, context: 'detailed_content' },
      { pattern: /\b(news today|current news|latest news|breaking news)\b/i, weight: 0.9, context: 'news_request' },
      { pattern: /\b(article|blog post|webpage|website content)\b/i, weight: 0.7, context: 'content_request' }
    ];

    const contextReferencePatterns = [
      /\b(its?|this|that|the)\s+(file structure|directory structure|structure|files|folders)\b/i,
      /\b(what|how).*(its?|this|that)\b/i,
      /\b(structure|files|folders|contents?)\s+(of\s+)?(it|this|that)\b/i
    ];

    const complexityIndicators = {
      simple: [/\b(what is|who is|simple|quick|brief)\b/i],
      moderate: [/\b(explain|describe|compare|analyze)\b/i],
      complex: [/\b(comprehensive|detailed|in-depth|thorough|complete)\b/i, /\band\b.*\band\b/i]
    };

    const referencesContext = contextReferencePatterns.some(pattern => pattern.test(message));
    const contextBoost = referencesContext && contextInfo.referencesGitHub ? 0.8 : 0;

    let detectedType: EnhancedToolDecision['detectedType'] = 'general';
    let shouldUseTools = false;
    let reasoning = '';
    let suggestedTools: string[] = [];
    let confidence = 0.6;
    let complexity: EnhancedToolDecision['complexity'] = 'simple';
    let estimatedSteps = 1;
    let fallbackStrategy: string | undefined;

    if (complexityIndicators.complex.some(pattern => pattern.test(message))) {
      complexity = 'complex';
      estimatedSteps = 4;
    } else if (complexityIndicators.moderate.some(pattern => pattern.test(message))) {
      complexity = 'moderate';
      estimatedSteps = 2;
    }

    let githubScore = 0;
    let searchScore = 0;
    let knowledgeScore = 0;
    let scrapingScore = 0;
    
    githubPatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(message)) githubScore += weight;
    });
    
    if (contextBoost > 0) {
      githubScore += contextBoost;
    }
    
    searchPatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(message)) searchScore += weight;
    });
    
    knowledgePatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(message)) knowledgeScore += weight;
    });

    // NEW: Calculate scraping score
    scrapingPatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(message)) scrapingScore += weight;
    });

    // Check for URLs and detailed content needs
    const hasUrls = /https?:\/\/[^\s]+/g.test(message);
    const needsDetailedContent = /\b(detailed|comprehensive|full|complete|in-depth|news today|current news|latest news)\b/i.test(message);

    // Enhanced decision logic for scraping scenarios
    if (hasUrls && scrapingScore >= 0.7) {
      detectedType = 'scrape-content';
      shouldUseTools = true;
      reasoning = `Direct web scraping request detected - user provided specific URL(s) and wants detailed content extraction`;
      suggestedTools = ['execute_web-scraper'];
      confidence = 0.95;
      fallbackStrategy = 'If scraping fails, try to provide information about the URL or suggest manual access';
    } else if (needsDetailedContent && searchScore >= 0.7) {
      detectedType = 'search-and-scrape';
      shouldUseTools = true;
      reasoning = `Comprehensive information request detected - requires web search followed by content extraction for detailed answers`;
      suggestedTools = ['execute_web-search', 'execute_web-scraper'];
      confidence = 0.9;
      complexity = 'complex';
      estimatedSteps = 4;
      fallbackStrategy = 'If scraping fails, provide summary from search results; if search fails, use knowledge base';
    } else if (githubScore >= 0.6 || (referencesContext && contextInfo.referencesGitHub)) {
      detectedType = 'github';
      shouldUseTools = true;
      reasoning = contextInfo.referencesGitHub 
        ? `Context-aware GitHub request detected - references previous GitHub repository discussion`
        : `GitHub repository or code-related request detected - requires GitHub tools for repository analysis`;
      suggestedTools = ['execute_github-tools'];
      confidence = Math.min(0.95, 0.7 + githubScore * 0.2);
      fallbackStrategy = 'If GitHub access fails, provide general guidance about repository structure and best practices';
    }
    else if (knowledgeScore >= 0.7) {
      detectedType = 'knowledge';
      shouldUseTools = true;
      reasoning = 'Knowledge base query detected - requires search through stored documents and conversations';
      suggestedTools = ['execute_knowledge-search-v2'];
      confidence = 0.85;
      fallbackStrategy = 'If no results found, suggest alternative search terms or approaches';
    }
    else if (searchScore >= 0.6) {
      const needsMultipleTools = searchScore > 0.8 || complexity === 'complex';
      detectedType = 'search';
      shouldUseTools = true;
      reasoning = 'Information search query detected - requires web search and/or knowledge base search';
      suggestedTools = needsMultipleTools ? 
        ['execute_web-search', 'execute_knowledge-search-v2'] : 
        ['execute_web-search'];
      confidence = 0.8;
      fallbackStrategy = 'If web search fails, try knowledge base search or provide general guidance';
    }
    else {
      detectedType = 'general';
      shouldUseTools = false;
      reasoning = 'General conversation or question - can be answered without external tools';
      suggestedTools = [];
      confidence = 0.7;
      estimatedSteps = 1;
    }

    if (shouldUseTools) {
      estimatedSteps = Math.max(estimatedSteps, suggestedTools.length + 1);
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
  }, [detectPlan]);

  const analyzeConversationContext = (currentMessage: string, conversationHistory: any[]) => {
    const contextInfo = {
      referencesGitHub: false,
      githubRepo: undefined as { owner: string; repo: string } | undefined,
      referencePrevious: false
    };

    const referenceWords = /\b(its?|this|that|the)\b/i;
    contextInfo.referencePrevious = referenceWords.test(currentMessage);

    const recentHistory = conversationHistory.slice(-5);
    
    for (const historyItem of recentHistory) {
      if (historyItem.content) {
        const githubUrlMatch = historyItem.content.match(/github\.com\/([\w-]+)\/([\w-]+)/i);
        if (githubUrlMatch) {
          contextInfo.referencesGitHub = true;
          contextInfo.githubRepo = {
            owner: githubUrlMatch[1],
            repo: githubUrlMatch[2]
          };
          break;
        }
        
        const githubKeywords = /\b(repository|repo|github|git)\b/i;
        if (githubKeywords.test(historyItem.content)) {
          contextInfo.referencesGitHub = true;
        }
      }
    }

    return contextInfo;
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
