
import { useState, useCallback } from 'react';
import { MultiToolPlan, ToolExecution } from '@/types/orchestrator';
import { usePlanCreation } from './orchestrator/usePlanCreation';
import { usePlanExecution } from './orchestrator/usePlanExecution';
import { usePlanDetection } from './orchestrator/usePlanDetection';

export const useMultiToolOrchestrator = () => {
  const [currentPlan, setCurrentPlan] = useState<MultiToolPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const { createPlan } = usePlanCreation();
  const { executePlan: executeInternalPlan } = usePlanExecution();
  const { shouldUseToolsForQuery, detectGitHubRequest } = usePlanDetection();

  const executePlan = useCallback(async (
    plan: MultiToolPlan,
    onStepUpdate: (execution: ToolExecution) => void,
    onPlanComplete: (result: string, plan: MultiToolPlan) => void
  ) => {
    setIsExecuting(true);
    setCurrentPlan({ ...plan, status: 'executing', startTime: new Date() });
    
    try {
      await executeInternalPlan(
        plan,
        (execution) => {
          // Update current plan with execution changes
          setCurrentPlan(prevPlan => {
            if (!prevPlan) return prevPlan;
            
            const updatedExecutions = prevPlan.executions.map(e => 
              e.id === execution.id ? execution : e
            );
            
            return {
              ...prevPlan,
              executions: updatedExecutions,
              currentExecutionIndex: updatedExecutions.findIndex(e => e.status === 'executing')
            };
          });
          
          onStepUpdate(execution);
        },
        (result, finalPlan) => {
          setCurrentPlan(finalPlan);
          onPlanComplete(result, finalPlan);
        }
      );
      
    } catch (error) {
      console.error('Plan execution failed:', error);
      
      const failedPlan: MultiToolPlan = {
        ...plan,
        status: 'failed',
        endTime: new Date()
      };
      
      setCurrentPlan(failedPlan);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [executeInternalPlan]);

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

// Re-export types for backward compatibility
export type { ToolExecution, MultiToolPlan } from '@/types/orchestrator';
