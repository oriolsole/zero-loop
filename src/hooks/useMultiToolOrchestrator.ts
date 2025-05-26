
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getModelSettings } from '@/services/modelProviderService';
import { useAuth } from '@/contexts/AuthContext';

export interface ToolExecution {
  id: string;
  tool: string;
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  estimatedDuration: number;
}

export interface MultiToolPlan {
  id: string;
  title: string;
  description: string;
  executions: ToolExecution[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  currentExecutionIndex: number;
  totalEstimatedTime: number;
  startTime?: Date;
  endTime?: Date;
}

export const useMultiToolOrchestrator = () => {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<MultiToolPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const shouldUseToolsForQuery = useCallback((query: string): boolean => {
    const lowerQuery = query.toLowerCase().trim();
    
    // Don't use tools for basic greetings or system queries
    const systemQueries = [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'what can you do', 'help me', 'thanks', 'thank you'
    ];
    
    if (systemQueries.some(q => lowerQuery === q || lowerQuery.startsWith(q + ' '))) {
      return false;
    }
    
    // Use tools for specific information requests
    const toolIndicators = [
      'search', 'find', 'look up', 'github', 'repository', 'repo',
      'latest', 'current', 'news', 'what is', 'who is', 'how to',
      'analyze', 'examine', 'check', 'show me', 'tell me about'
    ];
    
    return toolIndicators.some(indicator => lowerQuery.includes(indicator));
  }, []);

  const detectGitHubRequest = useCallback((query: string): { isGithub: boolean; owner?: string; repo?: string; action?: string } => {
    const lowerQuery = query.toLowerCase();
    
    // Check for GitHub URL
    const githubUrlMatch = query.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)/i);
    if (githubUrlMatch) {
      return {
        isGithub: true,
        owner: githubUrlMatch[1],
        repo: githubUrlMatch[2],
        action: 'get_repository'
      };
    }
    
    // Check for repository name patterns
    const repoNameMatch = query.match(/\b([\w-]+\/[\w-]+)\b/);
    if (repoNameMatch && (lowerQuery.includes('repo') || lowerQuery.includes('github'))) {
      const [owner, repo] = repoNameMatch[1].split('/');
      return {
        isGithub: true,
        owner,
        repo,
        action: 'get_repository'
      };
    }
    
    // Check for commit-related requests
    if (lowerQuery.includes('commit') || lowerQuery.includes('latest')) {
      return {
        isGithub: true,
        action: 'get_commits'
      };
    }
    
    // Check for general GitHub keywords
    const githubKeywords = ['github', 'repository', 'repo', 'branch', 'pull request', 'pr'];
    if (githubKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return { isGithub: true };
    }
    
    return { isGithub: false };
  }, []);

  const inferToolFromStep = useCallback((step: string, context?: any): string => {
    const lowerStep = step.toLowerCase();
    
    // GitHub-specific tool inference
    if (context?.isGithub || lowerStep.includes('github') || lowerStep.includes('repository') || lowerStep.includes('repo') || lowerStep.includes('commit')) {
      return 'execute_github-tools';
    }
    
    // Knowledge base search
    if (lowerStep.includes('knowledge') || lowerStep.includes('my notes') || lowerStep.includes('remember')) {
      return 'execute_knowledge-search-v2';
    }
    
    // Web search for everything else
    return 'execute_web-search';
  }, []);

  const createPlan = useCallback((query: string): MultiToolPlan | null => {
    if (!shouldUseToolsForQuery(query)) {
      return null;
    }

    const githubContext = detectGitHubRequest(query);
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let executions: ToolExecution[] = [];
    let title = '';
    let description = '';

    if (githubContext.isGithub) {
      // GitHub-specific plan
      if (query.toLowerCase().includes('latest commit') || query.toLowerCase().includes('commits')) {
        title = 'GitHub Repository Commits';
        description = 'Fetching latest commits from repository';
        executions = [
          {
            id: `${planId}-exec-1`,
            tool: 'execute_github-tools',
            description: 'Fetch latest commits',
            status: 'pending',
            parameters: {
              action: 'get_commits',
              owner: githubContext.owner || 'oriolsole',
              repository: githubContext.repo || 'zero-loop'
            },
            estimatedDuration: 5
          }
        ];
      } else {
        title = 'GitHub Repository Analysis';
        description = 'Analyzing repository information';
        executions = [
          {
            id: `${planId}-exec-1`,
            tool: 'execute_github-tools',
            description: 'Fetch repository information',
            status: 'pending',
            parameters: {
              action: 'get_repository',
              owner: githubContext.owner || 'oriolsole',
              repository: githubContext.repo || 'zero-loop'
            },
            estimatedDuration: 5
          }
        ];
      }
    } else {
      // General search plan
      title = 'Information Search';
      description = 'Searching for requested information';
      executions = [
        {
          id: `${planId}-exec-1`,
          tool: inferToolFromStep(query),
          description: 'Search for information',
          status: 'pending',
          parameters: { query },
          estimatedDuration: 6
        }
      ];
    }

    const totalEstimatedTime = executions.reduce((sum, exec) => sum + exec.estimatedDuration, 0);

    return {
      id: planId,
      title,
      description,
      executions,
      status: 'pending',
      currentExecutionIndex: 0,
      totalEstimatedTime
    };
  }, [shouldUseToolsForQuery, detectGitHubRequest, inferToolFromStep]);

  const executeStep = useCallback(async (execution: ToolExecution): Promise<ToolExecution> => {
    const modelSettings = getModelSettings();
    
    try {
      console.log('Executing tool:', execution.tool, 'with parameters:', execution.parameters);
      
      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: `Execute ${execution.tool} with parameters: ${JSON.stringify(execution.parameters)}`,
          userId: user?.id,
          modelSettings,
          toolExecution: {
            tool: execution.tool,
            parameters: execution.parameters
          }
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Create new execution object with completed status
      const completedExecution: ToolExecution = {
        ...execution,
        status: 'completed',
        result: data,
        endTime: new Date()
      };
      
      return completedExecution;
      
    } catch (error) {
      console.error('Tool execution failed:', error);
      
      // Create new execution object with failed status
      const failedExecution: ToolExecution = {
        ...execution,
        status: 'failed',
        error: error.message,
        endTime: new Date()
      };
      
      return failedExecution;
    }
  }, [user]);

  const executePlan = useCallback(async (
    plan: MultiToolPlan,
    onStepUpdate: (execution: ToolExecution) => void,
    onPlanComplete: (result: string, plan: MultiToolPlan) => void
  ) => {
    setIsExecuting(true);
    setCurrentPlan({ ...plan, status: 'executing', startTime: new Date() });
    
    const results: any[] = [];
    let updatedPlan = { ...plan, status: 'executing' as const, startTime: new Date() };
    
    try {
      for (let i = 0; i < plan.executions.length; i++) {
        const execution = plan.executions[i];
        
        // Update execution to executing
        const executingExecution: ToolExecution = {
          ...execution,
          status: 'executing',
          startTime: new Date()
        };
        
        updatedPlan = {
          ...updatedPlan,
          currentExecutionIndex: i,
          executions: updatedPlan.executions.map((e, idx) => 
            idx === i ? executingExecution : e
          )
        };
        
        setCurrentPlan(updatedPlan);
        onStepUpdate(executingExecution);
        
        // Execute the step
        const completedExecution = await executeStep(executingExecution);
        
        // Update plan with completed execution
        updatedPlan = {
          ...updatedPlan,
          executions: updatedPlan.executions.map((e, idx) => 
            idx === i ? completedExecution : e
          )
        };
        
        setCurrentPlan(updatedPlan);
        onStepUpdate(completedExecution);
        
        if (completedExecution.status === 'completed') {
          results.push(completedExecution.result);
        } else {
          throw new Error(completedExecution.error || 'Execution failed');
        }
      }
      
      // Plan completed successfully
      const finalPlan: MultiToolPlan = {
        ...updatedPlan,
        status: 'completed',
        endTime: new Date()
      };
      
      setCurrentPlan(finalPlan);
      
      const finalResult = results.length > 0 ? 
        (typeof results[results.length - 1] === 'string' ? 
          results[results.length - 1] : 
          JSON.stringify(results[results.length - 1])) :
        'Plan completed successfully';
        
      onPlanComplete(finalResult, finalPlan);
      
    } catch (error) {
      console.error('Plan execution failed:', error);
      
      const failedPlan: MultiToolPlan = {
        ...updatedPlan,
        status: 'failed',
        endTime: new Date()
      };
      
      setCurrentPlan(failedPlan);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [executeStep]);

  const cancelPlan = useCallback(() => {
    if (currentPlan) {
      setCurrentPlan({
        ...currentPlan,
        status: 'failed',
        endTime: new Date()
      });
    }
    setIsExecuting(false);
  }, [currentPlan]);

  const getProgress = useCallback(() => {
    if (!currentPlan) return { current: 0, total: 0, percentage: 0 };
    
    const completed = currentPlan.executions.filter(exec => exec.status === 'completed').length;
    const total = currentPlan.executions.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { current: completed, total, percentage };
  }, [currentPlan]);

  return {
    currentPlan,
    isExecuting,
    createPlan,
    executePlan,
    cancelPlan,
    getProgress,
    shouldUseToolsForQuery,
    detectGitHubRequest
  };
};
