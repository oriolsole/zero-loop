
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getModelSettings } from '@/services/modelProviderService';
import { useAuth } from '@/contexts/AuthContext';
import { ToolExecution, MultiToolPlan } from '@/types/orchestrator';

export const usePlanExecution = () => {
  const { user } = useAuth();

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
      
      return {
        ...execution,
        status: 'completed',
        result: data,
        endTime: new Date()
      };
      
    } catch (error) {
      console.error('Tool execution failed:', error);
      
      return {
        ...execution,
        status: 'failed',
        error: error.message,
        endTime: new Date()
      };
    }
  }, [user]);

  const executePlan = useCallback(async (
    plan: MultiToolPlan,
    onStepUpdate: (execution: ToolExecution) => void,
    onPlanComplete: (result: string, plan: MultiToolPlan) => void
  ) => {
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
      
      const finalResult = results.length > 0 ? 
        (typeof results[results.length - 1] === 'string' ? 
          results[results.length - 1] : 
          JSON.stringify(results[results.length - 1])) :
        'Plan completed successfully';
        
      onPlanComplete(finalResult, finalPlan);
      
    } catch (error) {
      console.error('Plan execution failed:', error);
      throw error;
    }
  }, [executeStep]);

  return { executePlan };
};
