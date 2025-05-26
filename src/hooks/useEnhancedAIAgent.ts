
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiToolOrchestrator } from './useMultiToolOrchestrator';
import { useContextAwarePlanning } from './useContextAwarePlanning';
import { extractIntelligentQuery } from '@/utils/intelligentQueryExtraction';

export interface EnhancedAgentExecution {
  id: string;
  query: string;
  status: 'analyzing' | 'planning' | 'executing' | 'synthesizing' | 'completed' | 'failed';
  currentStep: string;
  progress: number;
  results: any[];
  finalResponse?: string;
  adaptations: number;
  toolsUsed: string[];
  executionTime: number;
}

export const useEnhancedAIAgent = () => {
  const { user } = useAuth();
  const [currentExecution, setCurrentExecution] = useState<EnhancedAgentExecution | null>(null);
  
  const {
    createOrchestrationPlan,
    executeOrchestrationPlan
  } = useMultiToolOrchestrator();
  
  const {
    generateContextualPlan
  } = useContextAwarePlanning();

  const executeEnhancedQuery = useCallback(async (
    query: string,
    conversationHistory: any[] = [],
    onProgressUpdate?: (execution: EnhancedAgentExecution) => void,
    onComplete?: (result: string) => void
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const startTime = Date.now();
    
    let execution: EnhancedAgentExecution = {
      id: `enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query,
      status: 'analyzing',
      currentStep: 'Analyzing query and extracting parameters...',
      progress: 10,
      results: [],
      adaptations: 0,
      toolsUsed: [],
      executionTime: 0
    };

    setCurrentExecution(execution);
    onProgressUpdate?.(execution);

    try {
      // Phase 1: Intelligent Query Analysis
      const extractedQuery = extractIntelligentQuery(query, conversationHistory);
      
      execution = {
        ...execution,
        status: 'planning',
        currentStep: `Planning ${extractedQuery.queryType} strategy...`,
        progress: 25
      };
      setCurrentExecution(execution);
      onProgressUpdate?.(execution);

      // Phase 2: Context-Aware Planning
      const availableTools = ['execute_web-search', 'execute_github-tools', 'execute_knowledge-search-v2', 'execute_web-scraper'];
      const contextualPlan = await generateContextualPlan(query, conversationHistory, availableTools);
      
      execution = {
        ...execution,
        status: 'executing',
        currentStep: `Executing ${contextualPlan.planType} plan...`,
        progress: 40
      };
      setCurrentExecution(execution);
      onProgressUpdate?.(execution);

      // Phase 3: Multi-Tool Orchestration
      const orchestrationPlan = await createOrchestrationPlan(query, conversationHistory);
      
      await executeOrchestrationPlan(
        orchestrationPlan,
        (toolExecution) => {
          execution = {
            ...execution,
            currentStep: `${toolExecution.status === 'executing' ? 'Running' : 'Completed'} ${toolExecution.toolName}...`,
            progress: Math.min(90, execution.progress + 10),
            toolsUsed: [...new Set([...execution.toolsUsed, toolExecution.toolName])],
            results: [...execution.results, toolExecution]
          };
          setCurrentExecution(execution);
          onProgressUpdate?.(execution);
        },
        (finalResult) => {
          execution = {
            ...execution,
            status: 'completed',
            currentStep: 'Synthesis complete',
            progress: 100,
            finalResponse: finalResult,
            executionTime: Date.now() - startTime
          };
          setCurrentExecution(execution);
          onProgressUpdate?.(execution);
          onComplete?.(finalResult);
        }
      );

    } catch (error) {
      execution = {
        ...execution,
        status: 'failed',
        currentStep: `Error: ${error.message}`,
        progress: 0,
        executionTime: Date.now() - startTime
      };
      setCurrentExecution(execution);
      onProgressUpdate?.(execution);
      throw error;
    }
  }, [user, createOrchestrationPlan, executeOrchestrationPlan, generateContextualPlan]);

  const resetExecution = useCallback(() => {
    setCurrentExecution(null);
  }, []);

  return {
    currentExecution,
    executeEnhancedQuery,
    resetExecution,
    isExecuting: currentExecution?.status === 'executing' || currentExecution?.status === 'planning'
  };
};
