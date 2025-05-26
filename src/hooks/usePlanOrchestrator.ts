
import { useState, useCallback } from 'react';

export interface PlanStep {
  id: string;
  type: 'search' | 'github' | 'knowledge' | 'synthesis';
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  tool: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  estimatedDuration: number;
  startTime?: string;
  endTime?: string;
}

export interface ExecutionPlan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  totalEstimatedTime: number;
  currentStepIndex: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  finalResult?: string;
}

export interface UsePlanOrchestratorReturn {
  currentPlan: ExecutionPlan | null;
  isExecuting: boolean;
  createPlan: (type: string, query: string, context?: any) => ExecutionPlan;
  executePlan: (plan: ExecutionPlan, onStepUpdate: (step: PlanStep) => void, onPlanComplete: (result: string) => void) => Promise<void>;
  cancelPlan: () => void;
  getProgress: () => { current: number; total: number; percentage: number };
}

export const usePlanOrchestrator = (): UsePlanOrchestratorReturn => {
  const [currentPlan, setCurrentPlan] = useState<ExecutionPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const createPlan = useCallback((type: string, query: string, context?: any): ExecutionPlan => {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let steps: PlanStep[] = [];
    let title = '';
    let description = '';

    switch (type) {
      case 'news-search':
        title = 'Comprehensive News Research';
        description = 'Gathering latest news from multiple sources';
        steps = [
          {
            id: `${planId}-step-1`,
            type: 'search',
            description: 'Search for breaking news',
            status: 'pending',
            tool: 'execute_web-search',
            parameters: { query: `breaking news today ${new Date().getFullYear()}` },
            estimatedDuration: 5
          },
          {
            id: `${planId}-step-2`,
            type: 'search',
            description: 'Search for technology news',
            status: 'pending',
            tool: 'execute_web-search',
            parameters: { query: `technology news today ${new Date().getFullYear()}` },
            estimatedDuration: 5
          },
          {
            id: `${planId}-step-3`,
            type: 'search',
            description: 'Search for business news',
            status: 'pending',
            tool: 'execute_web-search',
            parameters: { query: `business news today ${new Date().getFullYear()}` },
            estimatedDuration: 5
          },
          {
            id: `${planId}-step-4`,
            type: 'synthesis',
            description: 'Organizing and summarizing all news findings',
            status: 'pending',
            tool: 'synthesize_results',
            parameters: { type: 'news_summary' },
            estimatedDuration: 3
          }
        ];
        break;

      case 'repo-analysis':
        title = 'Repository Deep Analysis';
        description = 'Comprehensive analysis of repository structure and purpose';
        steps = [
          {
            id: `${planId}-step-1`,
            type: 'github',
            description: 'Fetch repository metadata and README',
            status: 'pending',
            tool: 'execute_github-tools',
            parameters: { 
              action: 'get_repository',
              owner: context?.owner,
              repository: context?.repo
            },
            estimatedDuration: 4
          },
          {
            id: `${planId}-step-2`,
            type: 'github',
            description: 'Analyze repository structure and key files',
            status: 'pending',
            tool: 'execute_github-tools',
            parameters: { 
              action: 'get_directory_structure',
              owner: context?.owner,
              repository: context?.repo
            },
            estimatedDuration: 4
          },
          {
            id: `${planId}-step-3`,
            type: 'github',
            description: 'Examine package.json and dependencies',
            status: 'pending',
            tool: 'execute_github-tools',
            parameters: { 
              action: 'get_file_content',
              owner: context?.owner,
              repository: context?.repo,
              path: 'package.json'
            },
            estimatedDuration: 3
          },
          {
            id: `${planId}-step-4`,
            type: 'synthesis',
            description: 'Synthesizing repository analysis',
            status: 'pending',
            tool: 'synthesize_results',
            parameters: { type: 'repo_analysis' },
            estimatedDuration: 4
          }
        ];
        break;

      case 'comprehensive-search':
        title = 'Multi-Source Research';
        description = 'Searching across web and knowledge base';
        steps = [
          {
            id: `${planId}-step-1`,
            type: 'search',
            description: 'Web search for current information',
            status: 'pending',
            tool: 'execute_web-search',
            parameters: { query },
            estimatedDuration: 5
          },
          {
            id: `${planId}-step-2`,
            type: 'knowledge',
            description: 'Search knowledge base for related content',
            status: 'pending',
            tool: 'execute_knowledge-search-v2',
            parameters: { query },
            estimatedDuration: 4
          },
          {
            id: `${planId}-step-3`,
            type: 'synthesis',
            description: 'Combining and organizing findings',
            status: 'pending',
            tool: 'synthesize_results',
            parameters: { type: 'comprehensive_search' },
            estimatedDuration: 3
          }
        ];
        break;

      default:
        // Single-step fallback
        steps = [
          {
            id: `${planId}-step-1`,
            type: 'search',
            description: 'Processing request',
            status: 'pending',
            tool: 'execute_web-search',
            parameters: { query },
            estimatedDuration: 5
          }
        ];
        title = 'Simple Query';
        description = 'Processing your request';
    }

    const totalEstimatedTime = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);

    const plan: ExecutionPlan = {
      id: planId,
      title,
      description,
      steps,
      totalEstimatedTime,
      currentStepIndex: 0,
      status: 'pending'
    };

    setCurrentPlan(plan);
    return plan;
  }, []);

  const executePlan = useCallback(async (
    plan: ExecutionPlan,
    onStepUpdate: (step: PlanStep) => void,
    onPlanComplete: (result: string) => void
  ) => {
    setIsExecuting(true);
    setCurrentPlan(prev => prev ? { ...prev, status: 'executing', startTime: new Date().toISOString() } : null);

    const results: any[] = [];

    try {
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        
        // Update step to executing
        const updatedStep = { 
          ...step, 
          status: 'executing' as const, 
          startTime: new Date().toISOString() 
        };
        
        setCurrentPlan(prev => prev ? {
          ...prev,
          currentStepIndex: i,
          steps: prev.steps.map((s, idx) => idx === i ? updatedStep : s)
        } : null);
        
        onStepUpdate(updatedStep);

        try {
          // Simulate tool execution based on step type
          let result;
          if (step.type === 'synthesis') {
            // Synthesis step - combine previous results
            result = await synthesizeResults(results, step.parameters.type);
          } else {
            // Regular tool execution - would call actual tools here
            await new Promise(resolve => setTimeout(resolve, step.estimatedDuration * 200)); // Simulate execution time
            result = `Simulated result for ${step.description}`;
          }

          const completedStep = {
            ...updatedStep,
            status: 'completed' as const,
            result,
            endTime: new Date().toISOString()
          };

          results.push(result);

          setCurrentPlan(prev => prev ? {
            ...prev,
            steps: prev.steps.map((s, idx) => idx === i ? completedStep : s)
          } : null);

          onStepUpdate(completedStep);

        } catch (error) {
          const failedStep = {
            ...updatedStep,
            status: 'failed' as const,
            error: error.message,
            endTime: new Date().toISOString()
          };

          setCurrentPlan(prev => prev ? {
            ...prev,
            steps: prev.steps.map((s, idx) => idx === i ? failedStep : s)
          } : null);

          onStepUpdate(failedStep);
          throw error;
        }
      }

      // Plan completed successfully
      const finalResult = results[results.length - 1] || 'Plan completed successfully';
      
      setCurrentPlan(prev => prev ? {
        ...prev,
        status: 'completed',
        finalResult,
        endTime: new Date().toISOString()
      } : null);

      onPlanComplete(finalResult);

    } catch (error) {
      setCurrentPlan(prev => prev ? {
        ...prev,
        status: 'failed',
        endTime: new Date().toISOString()
      } : null);
      
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const cancelPlan = useCallback(() => {
    setCurrentPlan(prev => prev ? {
      ...prev,
      status: 'failed',
      endTime: new Date().toISOString()
    } : null);
    setIsExecuting(false);
  }, []);

  const getProgress = useCallback(() => {
    if (!currentPlan) return { current: 0, total: 0, percentage: 0 };
    
    const completed = currentPlan.steps.filter(step => step.status === 'completed').length;
    const total = currentPlan.steps.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { current: completed, total, percentage };
  }, [currentPlan]);

  return {
    currentPlan,
    isExecuting,
    createPlan,
    executePlan,
    cancelPlan,
    getProgress
  };
};

async function synthesizeResults(results: any[], type: string): Promise<string> {
  // This would normally call the AI model to synthesize results
  // For now, we'll return a structured summary
  switch (type) {
    case 'news_summary':
      return `# Today's News Summary\n\n## Breaking News\n${results[0] || 'No breaking news found'}\n\n## Technology\n${results[1] || 'No tech news found'}\n\n## Business\n${results[2] || 'No business news found'}`;
    
    case 'repo_analysis':
      return `# Repository Analysis\n\n## Overview\n${results[0] || 'Repository metadata'}\n\n## Structure\n${results[1] || 'Directory structure'}\n\n## Dependencies\n${results[2] || 'Package information'}`;
    
    case 'comprehensive_search':
      return `# Research Results\n\n## Web Findings\n${results[0] || 'Web search results'}\n\n## Knowledge Base\n${results[1] || 'Knowledge base results'}`;
    
    default:
      return results.join('\n\n');
  }
}
