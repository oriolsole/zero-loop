
import { useState, useCallback } from 'react';
import { EnhancedToolDecision } from '@/components/knowledge/EnhancedToolDecision';

export interface UseEnhancedToolDecisionReturn {
  toolDecision: EnhancedToolDecision | null;
  currentStep: number;
  isExecuting: boolean;
  analyzeRequest: (message: string, conversationHistory?: any[]) => EnhancedToolDecision;
  startExecution: () => void;
  nextStep: () => void;
  completeExecution: () => void;
  resetDecision: () => void;
}

export const useEnhancedToolDecision = (): UseEnhancedToolDecisionReturn => {
  const [toolDecision, setToolDecision] = useState<EnhancedToolDecision | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);

  const analyzeRequest = useCallback((message: string, conversationHistory: any[] = []): EnhancedToolDecision => {
    const lowerMessage = message.toLowerCase();
    
    // Analyze conversation context
    const contextInfo = analyzeConversationContext(message, conversationHistory);
    
    // Enhanced pattern recognition with context awareness
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

    // Context-aware reference patterns
    const contextReferencePatterns = [
      /\b(its?|this|that|the)\s+(file structure|directory structure|structure|files|folders)\b/i,
      /\b(what|how).*(its?|this|that)\b/i,
      /\b(structure|files|folders|contents?)\s+(of\s+)?(it|this|that)\b/i
    ];

    // Complexity assessment
    const complexityIndicators = {
      simple: [/\b(what is|who is|simple|quick|brief)\b/i],
      moderate: [/\b(explain|describe|compare|analyze)\b/i],
      complex: [/\b(comprehensive|detailed|in-depth|thorough|complete)\b/i, /\band\b.*\band\b/i]
    };

    // Check if message references previous context
    const referencesContext = contextReferencePatterns.some(pattern => pattern.test(message));
    
    // Apply context boost for GitHub if we're referencing previous GitHub content
    const contextBoost = referencesContext && contextInfo.referencesGitHub ? 0.8 : 0;

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

    // Pattern matching with weighted scoring
    let githubScore = 0;
    let searchScore = 0;
    let knowledgeScore = 0;
    
    githubPatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(message)) githubScore += weight;
    });
    
    // Add context boost to GitHub score if appropriate
    if (contextBoost > 0) {
      githubScore += contextBoost;
    }
    
    searchPatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(message)) searchScore += weight;
    });
    
    knowledgePatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(message)) knowledgeScore += weight;
    });

    // GitHub detection with context awareness
    if (githubScore >= 0.6 || (referencesContext && contextInfo.referencesGitHub)) {
      detectedType = 'github';
      shouldUseTools = true;
      reasoning = contextInfo.referencesGitHub 
        ? `Context-aware GitHub request detected - references previous GitHub repository discussion`
        : `GitHub repository or code-related request detected - requires GitHub tools for repository analysis`;
      suggestedTools = ['execute_github-tools'];
      confidence = Math.min(0.95, 0.7 + githubScore * 0.2);
      fallbackStrategy = 'If GitHub access fails, provide general guidance about repository structure and best practices';
    }
    // Knowledge base detection
    else if (knowledgeScore >= 0.7) {
      detectedType = 'knowledge';
      shouldUseTools = true;
      reasoning = 'Knowledge base query detected - requires search through stored documents and conversations';
      suggestedTools = ['execute_knowledge-search-v2'];
      confidence = 0.85;
      fallbackStrategy = 'If no results found, suggest alternative search terms or approaches';
    }
    // Web search detection
    else if (searchScore >= 0.6) {
      detectedType = 'search';
      shouldUseTools = true;
      reasoning = 'Information search query detected - requires web search and/or knowledge base search';
      suggestedTools = ['execute_web-search', 'execute_knowledge-search-v2'];
      confidence = 0.8;
      fallbackStrategy = 'If web search fails, try knowledge base search or provide general guidance';
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

    // Adjust steps based on tools and context
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

  // Helper function to analyze conversation context
  const analyzeConversationContext = (currentMessage: string, conversationHistory: any[]) => {
    const contextInfo = {
      referencesGitHub: false,
      githubRepo: undefined as { owner: string; repo: string } | undefined,
      referencePrevious: false
    };

    // Check if current message uses reference words
    const referenceWords = /\b(its?|this|that|the)\b/i;
    contextInfo.referencePrevious = referenceWords.test(currentMessage);

    // Look for GitHub context in recent conversation history (last 5 messages)
    const recentHistory = conversationHistory.slice(-5);
    
    for (const historyItem of recentHistory) {
      if (historyItem.content) {
        // Check for GitHub URLs
        const githubUrlMatch = historyItem.content.match(/github\.com\/([\w-]+)\/([\w-]+)/i);
        if (githubUrlMatch) {
          contextInfo.referencesGitHub = true;
          contextInfo.githubRepo = {
            owner: githubUrlMatch[1],
            repo: githubUrlMatch[2]
          };
          break;
        }
        
        // Check for GitHub-related discussion
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
