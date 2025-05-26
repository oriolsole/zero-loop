import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getModelSettings } from '@/services/modelProviderService';

export interface DynamicPlanStep {
  id: string;
  description: string;
  tool: string;
  parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime?: string;
  endTime?: string;
  reasoning?: string;
}

export interface DynamicExecutionPlan {
  id: string;
  title: string;
  description: string;
  steps: DynamicPlanStep[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  currentStepIndex: number;
  isAdaptive: boolean;
  totalEstimatedTime: number;
  startTime?: string;
  endTime?: string;
  finalResult?: string;
}

export const useDynamicPlanOrchestrator = () => {
  const [currentPlan, setCurrentPlan] = useState<DynamicExecutionPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const createDynamicPlan = useCallback(async (
    userRequest: string,
    suggestedSteps: string[],
    planType: string
  ): Promise<DynamicExecutionPlan> => {
    const planId = `dynamic-plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const steps = await convertStepsToExecutable(suggestedSteps, planId);
    const totalEstimatedTime = steps.length * 5; // Estimate 5 seconds per step
    
    const plan: DynamicExecutionPlan = {
      id: planId,
      title: `AI-Generated Plan: ${planType}`,
      description: `Dynamic execution plan for: ${userRequest}`,
      steps,
      status: 'pending',
      currentStepIndex: 0,
      isAdaptive: true,
      totalEstimatedTime,
      startTime: new Date().toISOString()
    };

    setCurrentPlan(plan);
    return plan;
  }, []);

  const executeDynamicPlan = useCallback(async (
    plan: DynamicExecutionPlan,
    originalRequest: string,
    onStepUpdate: (step: DynamicPlanStep) => void,
    onPlanComplete: (result: string) => void
  ) => {
    setIsExecuting(true);
    setCurrentPlan(prev => prev ? { ...prev, status: 'executing' } : null);

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
          // Execute the step
          const result = await executeStep(step, results, originalRequest);
          
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

          // After each step, ask AI if we need to adapt the plan
          if (i < plan.steps.length - 1) {
            const shouldAdapt = await shouldAdaptPlan(originalRequest, results, plan.steps.slice(i + 1));
            if (shouldAdapt.needsAdaptation) {
              const newSteps = await adaptPlan(originalRequest, results, shouldAdapt.reasoning);
              
              setCurrentPlan(prev => prev ? {
                ...prev,
                steps: [
                  ...prev.steps.slice(0, i + 1),
                  ...newSteps
                ]
              } : null);
            }
          }

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
          console.error('Step failed:', error);
          // Continue with next step instead of stopping
        }
      }

      // Synthesize final result
      const finalResult = await synthesizeFinalResult(originalRequest, results);
      
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
    createDynamicPlan,
    executeDynamicPlan,
    getProgress
  };
};

async function convertStepsToExecutable(suggestedSteps: string[], planId: string): Promise<DynamicPlanStep[]> {
  return suggestedSteps.map((step, index) => ({
    id: `${planId}-step-${index + 1}`,
    description: step,
    tool: inferToolFromStep(step),
    parameters: inferParametersFromStep(step),
    status: 'pending'
  }));
}

function inferToolFromStep(step: string): string {
  const lowerStep = step.toLowerCase();
  if (lowerStep.includes('search') || lowerStep.includes('find') || lowerStep.includes('look')) {
    return 'execute_web-search';
  }
  if (lowerStep.includes('github') || lowerStep.includes('repo') || lowerStep.includes('code')) {
    return 'execute_github-tools';
  }
  if (lowerStep.includes('knowledge') || lowerStep.includes('remember') || lowerStep.includes('note')) {
    return 'execute_knowledge-search-v2';
  }
  if (lowerStep.includes('synthesize') || lowerStep.includes('combine') || lowerStep.includes('organize')) {
    return 'synthesize_results';
  }
  return 'execute_web-search'; // default
}

function inferParametersFromStep(step: string): Record<string, any> {
  // Extract key terms for search parameters
  const keywords = step.replace(/^(search|find|look for|get|fetch)\s+/i, '');
  return { query: keywords };
}

async function executeStep(step: DynamicPlanStep, previousResults: any[], originalRequest: string): Promise<any> {
  // Simulate step execution - in reality this would call actual tools
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  if (step.tool === 'synthesize_results') {
    return `Synthesized result from ${previousResults.length} previous steps for: ${step.description}`;
  }
  
  return `AI-executed result for: ${step.description} (tool: ${step.tool})`;
}

async function shouldAdaptPlan(originalRequest: string, results: any[], remainingSteps: DynamicPlanStep[]): Promise<{needsAdaptation: boolean, reasoning: string}> {
  // Ask AI if plan needs adaptation based on results so far
  try {
    const modelSettings = getModelSettings();
    
    const adaptationPrompt = `Based on the results so far, should we adapt the remaining plan steps?

Original Request: ${originalRequest}
Results So Far: ${JSON.stringify(results.slice(-2))}
Remaining Steps: ${remainingSteps.map(s => s.description).join(', ')}

Respond with JSON: {"needsAdaptation": boolean, "reasoning": "explanation"}`;

    const { data } = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [{ role: 'user', content: adaptationPrompt }],
        temperature: 0.3,
        max_tokens: 200,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel
        })
      }
    });

    const response = data.message || data.content || '';
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Plan adaptation check failed:', error);
  }
  
  return { needsAdaptation: false, reasoning: 'No adaptation needed' };
}

async function adaptPlan(originalRequest: string, results: any[], reasoning: string): Promise<DynamicPlanStep[]> {
  // Generate new steps based on current results
  const planId = `adapted-${Date.now()}`;
  return [
    {
      id: `${planId}-adapted-1`,
      description: `Adapted step: Continue based on previous findings`,
      tool: 'execute_web-search',
      parameters: { query: originalRequest },
      status: 'pending'
    }
  ];
}

async function synthesizeFinalResult(originalRequest: string, results: any[]): Promise<string> {
  try {
    const modelSettings = getModelSettings();
    
    const synthesisPrompt = `Synthesize these results into a comprehensive answer for the user.

Original Request: ${originalRequest}
Results: ${JSON.stringify(results)}

Provide a well-organized, helpful response that directly addresses the user's request.`;

    const { data } = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [{ role: 'user', content: synthesisPrompt }],
        temperature: 0.4,
        max_tokens: 800,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel
        })
      }
    });

    return data.message || data.content || `Comprehensive response based on ${results.length} research steps.`;
  } catch (error) {
    console.error('Final synthesis failed:', error);
    return `Based on my research across ${results.length} steps, here are the key findings: ${results.join(' ')}`;
  }
}
