
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getModelSettings } from '@/services/modelProviderService';
import { useAuth } from '@/contexts/AuthContext';

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
  extractedContent?: string;
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
  accumulatedFindings?: Record<string, any>;
}

export const useDynamicPlanOrchestrator = () => {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<DynamicExecutionPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const createDynamicPlan = useCallback(async (
    userRequest: string,
    suggestedSteps: string[],
    planType: string
  ): Promise<DynamicExecutionPlan> => {
    const planId = `dynamic-plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const steps = await convertStepsToExecutable(suggestedSteps, planId);
    const totalEstimatedTime = steps.length * 8;
    
    const plan: DynamicExecutionPlan = {
      id: planId,
      title: `AI-Generated Plan: ${planType}`,
      description: `Dynamic execution plan for: ${userRequest}`,
      steps,
      status: 'pending',
      currentStepIndex: 0,
      isAdaptive: true,
      totalEstimatedTime,
      startTime: new Date().toISOString(),
      accumulatedFindings: {}
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

    const accumulatedContent: string[] = [];
    const findings: Record<string, any> = {};

    try {
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        
        const updatedStep = { 
          ...step, 
          status: 'executing' as const, 
          startTime: new Date().toISOString(),
          reasoning: `Executing ${step.description} to gather information for: ${originalRequest}`
        };
        
        setCurrentPlan(prev => prev ? {
          ...prev,
          currentStepIndex: i,
          steps: prev.steps.map((s, idx) => idx === i ? updatedStep : s)
        } : null);
        
        onStepUpdate(updatedStep);

        try {
          const result = await executeStepWithRealTools(step, accumulatedContent, originalRequest, user?.id);
          
          // Extract and structure content from search results
          const extractedContent = extractContentFromResult(result, step.tool);
          if (extractedContent) {
            accumulatedContent.push(extractedContent);
            findings[step.tool] = extractedContent;
          }

          const completedStep = {
            ...updatedStep,
            status: 'completed' as const,
            result,
            extractedContent,
            endTime: new Date().toISOString()
          };

          setCurrentPlan(prev => prev ? {
            ...prev,
            steps: prev.steps.map((s, idx) => idx === i ? completedStep : s),
            accumulatedFindings: findings
          } : null);

          onStepUpdate(completedStep);

          // Intelligent adaptation: analyze if we need more steps
          if (i < plan.steps.length - 1) {
            const adaptationResult = await intelligentAdaptation(
              originalRequest, 
              accumulatedContent, 
              plan.steps.slice(i + 1)
            );
            
            if (adaptationResult.needsAdaptation) {
              const newSteps = await generateAdaptiveSteps(
                originalRequest, 
                accumulatedContent, 
                adaptationResult.reasoning
              );
              
              if (newSteps.length > 0) {
                setCurrentPlan(prev => prev ? {
                  ...prev,
                  steps: [
                    ...prev.steps.slice(0, i + 1),
                    ...newSteps,
                    ...prev.steps.slice(i + 1).filter(s => !s.description.includes('Organize'))
                  ]
                } : null);
              }
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
        }
      }

      // Comprehensive synthesis of all findings
      const finalResult = await comprehensiveSynthesis(originalRequest, accumulatedContent, findings);
      
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
  }, [user]);

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

// Enhanced step conversion with better tool inference
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
  if (lowerStep.includes('search') || lowerStep.includes('find') || lowerStep.includes('news') || lowerStep.includes('current')) {
    return 'execute_web-search';
  }
  if (lowerStep.includes('github') || lowerStep.includes('repo') || lowerStep.includes('code')) {
    return 'execute_github-tools';
  }
  if (lowerStep.includes('knowledge') || lowerStep.includes('remember')) {
    return 'execute_knowledge-search-v2';
  }
  return 'execute_web-search';
}

function inferParametersFromStep(step: string): Record<string, any> {
  const keywords = step.replace(/^(search|find|look for|get|fetch)\s+/i, '');
  return { query: keywords };
}

// Enhanced tool execution with proper result extraction
async function executeStepWithRealTools(
  step: DynamicPlanStep, 
  previousContent: string[], 
  originalRequest: string, 
  userId?: string
): Promise<any> {
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const modelSettings = getModelSettings();

  try {
    const { data, error } = await supabase.functions.invoke('ai-agent', {
      body: {
        message: step.description,
        conversationHistory: [],
        userId: userId,
        sessionId: `plan-execution-${Date.now()}`,
        streaming: false,
        modelSettings: modelSettings,
        forcedTool: step.tool,
        toolParameters: step.parameters
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Tool execution failed');
    }

    return data.message || data.toolResults || `Executed ${step.tool} successfully`;

  } catch (error) {
    console.error(`Tool execution failed for ${step.tool}:`, error);
    throw error;
  }
}

// Extract meaningful content from tool results
function extractContentFromResult(result: any, toolType: string): string | null {
  if (!result) return null;
  
  try {
    if (typeof result === 'string') {
      return result;
    }
    
    if (result.data && Array.isArray(result.data)) {
      return result.data.map((item: any) => {
        if (item.title && item.snippet) {
          return `${item.title}: ${item.snippet}`;
        }
        return JSON.stringify(item);
      }).join('\n\n');
    }
    
    if (result.results && Array.isArray(result.results)) {
      return result.results.map((item: any) => {
        if (item.title && item.snippet) {
          return `${item.title}: ${item.snippet}`;
        }
        return JSON.stringify(item);
      }).join('\n\n');
    }
    
    return JSON.stringify(result);
  } catch (error) {
    console.error('Error extracting content:', error);
    return null;
  }
}

// Intelligent adaptation logic
async function intelligentAdaptation(
  originalRequest: string, 
  accumulatedContent: string[], 
  remainingSteps: DynamicPlanStep[]
): Promise<{needsAdaptation: boolean, reasoning: string}> {
  if (accumulatedContent.length === 0) {
    return { needsAdaptation: true, reasoning: 'No content gathered yet, need more searches' };
  }

  try {
    const modelSettings = getModelSettings();
    
    const adaptationPrompt = `Analyze the content gathered so far and determine if we need additional searches.

Original Request: ${originalRequest}
Content Gathered: ${accumulatedContent.slice(-1000)} // Last 1000 chars
Remaining Steps: ${remainingSteps.map(s => s.description).join(', ')}

Based on this analysis, do we have sufficient information to provide a comprehensive answer?
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
    console.error('Adaptation analysis failed:', error);
  }
  
  return { needsAdaptation: false, reasoning: 'Continue with current plan' };
}

// Generate adaptive steps based on content gaps
async function generateAdaptiveSteps(
  originalRequest: string, 
  accumulatedContent: string[], 
  reasoning: string
): Promise<DynamicPlanStep[]> {
  try {
    const modelSettings = getModelSettings();
    
    const stepPrompt = `Based on the content gathered so far, suggest 1-2 specific additional search queries.

Original Request: ${originalRequest}
Content So Far: ${accumulatedContent.join('\n')}
Gap Analysis: ${reasoning}

Suggest specific search queries that would fill the information gaps.
Respond with JSON: {"queries": ["query1", "query2"]}`;

    const { data } = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [{ role: 'user', content: stepPrompt }],
        temperature: 0.4,
        max_tokens: 300,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel
        })
      }
    });

    const response = data.message || data.content || '';
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const planId = `adaptive-${Date.now()}`;
      
      return parsed.queries.map((query: string, index: number) => ({
        id: `${planId}-${index + 1}`,
        description: `Search for: ${query}`,
        tool: 'execute_web-search',
        parameters: { query },
        status: 'pending' as const
      }));
    }
  } catch (error) {
    console.error('Adaptive step generation failed:', error);
  }
  
  return [];
}

// Comprehensive synthesis of all findings
async function comprehensiveSynthesis(
  originalRequest: string, 
  accumulatedContent: string[], 
  findings: Record<string, any>
): Promise<string> {
  try {
    const modelSettings = getModelSettings();
    
    const synthesisPrompt = `Create a comprehensive, well-organized response based on all the research findings.

Original Request: ${originalRequest}
All Research Content: ${accumulatedContent.join('\n\n')}

Instructions:
- Organize information by importance and relevance
- Include specific details from the sources
- Structure with clear headings and bullet points
- Provide a balanced overview of the topic
- Include timestamps or dates when available
- Be factual and informative

Create a detailed, professional response that fully addresses the user's request.`;

    const { data } = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [{ role: 'user', content: synthesisPrompt }],
        temperature: 0.4,
        max_tokens: 1200,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel
        })
      }
    });

    return data.message || data.content || `Based on comprehensive research across ${accumulatedContent.length} sources, here are the key findings: ${accumulatedContent.join(' ')}`;
  } catch (error) {
    console.error('Final synthesis failed:', error);
    return `Based on research findings: ${accumulatedContent.join('\n\n')}`;
  }
}
