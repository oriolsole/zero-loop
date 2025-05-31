
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getModelSettings } from '@/services/modelProviderService';
import { useAuth } from '@/contexts/AuthContext';
import { ToolExecution, MultiToolPlan } from '@/types/orchestrator';
import { useToolDependencies } from './useToolDependencies';

export const usePlanExecution = () => {
  const { user } = useAuth();
  const { injectDependencyParameters } = useToolDependencies();

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

  const executeGroup = useCallback(async (
    group: ToolExecution[],
    completedExecutions: Map<string, ToolExecution>,
    onStepUpdate: (execution: ToolExecution) => void
  ): Promise<ToolExecution[]> => {
    console.log(`🚀 Executing group of ${group.length} tools in parallel`);
    
    // Inject dependency parameters for each execution
    const executionsWithDeps = group.map(execution => 
      injectDependencyParameters(execution, completedExecutions)
    );

    // Update all executions to executing status
    executionsWithDeps.forEach(execution => {
      const executingExecution: ToolExecution = {
        ...execution,
        status: 'executing',
        startTime: new Date()
      };
      onStepUpdate(executingExecution);
    });

    // Execute all tools in parallel
    const executionPromises = executionsWithDeps.map(execution => 
      executeStep({
        ...execution,
        status: 'executing',
        startTime: new Date()
      })
    );

    try {
      const results = await Promise.all(executionPromises);
      
      // Update with results
      results.forEach(result => {
        onStepUpdate(result);
        if (result.status === 'completed') {
          completedExecutions.set(result.id, result);
        }
      });

      return results;
    } catch (error) {
      console.error('Group execution failed:', error);
      throw error;
    }
  }, [executeStep, injectDependencyParameters]);

  const executePlan = useCallback(async (
    plan: MultiToolPlan,
    onStepUpdate: (execution: ToolExecution) => void,
    onPlanComplete: (result: string, plan: MultiToolPlan) => void
  ) => {
    const completedExecutions = new Map<string, ToolExecution>();
    const allResults: any[] = [];
    let updatedPlan = { ...plan, status: 'executing' as const, startTime: new Date() };
    
    try {
      console.log(`🎯 Executing plan with ${plan.executionGroups.length} groups`);
      
      // Execute each group sequentially, but tools within groups run in parallel
      for (let groupIndex = 0; groupIndex < plan.executionGroups.length; groupIndex++) {
        const group = plan.executionGroups[groupIndex];
        
        updatedPlan = {
          ...updatedPlan,
          currentGroupIndex: groupIndex
        };

        console.log(`📦 Group ${groupIndex + 1}/${plan.executionGroups.length}: ${group.length} tools`);
        
        const groupResults = await executeGroup(group, completedExecutions, onStepUpdate);
        
        // Check if any execution in the group failed
        const failedExecution = groupResults.find(result => result.status === 'failed');
        if (failedExecution) {
          throw new Error(`Group execution failed: ${failedExecution.error}`);
        }

        // Collect successful results
        groupResults.forEach(result => {
          if (result.status === 'completed') {
            allResults.push(result.result);
          }
        });
      }
      
      // Plan completed successfully
      const finalPlan: MultiToolPlan = {
        ...updatedPlan,
        status: 'completed',
        endTime: new Date()
      };
      
      const finalResult = allResults.length > 0 ? 
        (typeof allResults[allResults.length - 1] === 'string' ? 
          allResults[allResults.length - 1] : 
          JSON.stringify(allResults[allResults.length - 1])) :
        'Plan completed successfully';
        
      console.log(`✅ Plan completed with ${allResults.length} results`);
      onPlanComplete(finalResult, finalPlan);
      
    } catch (error) {
      console.error('Plan execution failed:', error);
      throw error;
    }
  }, [executeGroup]);

  return { executePlan };
};
