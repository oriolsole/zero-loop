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
  aiInsight?: string;
  progressUpdate?: string;
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
  followUpSuggestions?: string[];
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
        
        // Generate AI progress update
        const progressUpdate = await generateProgressUpdate(step, originalRequest, i + 1, plan.steps.length);
        
        const updatedStep = { 
          ...step, 
          status: 'executing' as const, 
          startTime: new Date().toISOString(),
          reasoning: `Executing ${step.description} to gather information for: ${originalRequest}`,
          progressUpdate
        };
        
        setCurrentPlan(prev => prev ? {
          ...prev,
          currentStepIndex: i,
          steps: prev.steps.map((s, idx) => idx === i ? updatedStep : s)
        } : null);
        
        onStepUpdate(updatedStep);

        try {
          const result = await executeStepWithRealTools(step, accumulatedContent, originalRequest, user?.id);
          
          // Extract and process content with AI analysis
          const extractedContent = await extractAndAnalyzeContent(result, step.tool, originalRequest);
          const aiInsight = await generateStepInsight(extractedContent, step, originalRequest, accumulatedContent);
          
          if (extractedContent) {
            accumulatedContent.push(extractedContent);
            findings[step.tool] = extractedContent;
          }

          const completedStep = {
            ...updatedStep,
            status: 'completed' as const,
            result,
            extractedContent,
            aiInsight,
            endTime: new Date().toISOString()
          };

          setCurrentPlan(prev => prev ? {
            ...prev,
            steps: prev.steps.map((s, idx) => idx === i ? completedStep : s),
            accumulatedFindings: findings
          } : null);

          onStepUpdate(completedStep);

          // Intelligent adaptation with AI-driven analysis
          if (i < plan.steps.length - 1) {
            const adaptationResult = await intelligentAdaptationWithAI(
              originalRequest, 
              accumulatedContent, 
              plan.steps.slice(i + 1),
              findings
            );
            
            if (adaptationResult.needsAdaptation) {
              const newSteps = await generateAdaptiveStepsWithAI(
                originalRequest, 
                accumulatedContent, 
                adaptationResult.reasoning,
                findings
              );
              
              if (newSteps.length > 0) {
                setCurrentPlan(prev => prev ? {
                  ...prev,
                  steps: [
                    ...prev.steps.slice(0, i + 1),
                    ...newSteps,
                    ...prev.steps.slice(i + 1)
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

      // AI-generated comprehensive synthesis with follow-up suggestions
      const { finalResult, followUpSuggestions } = await comprehensiveSynthesisWithFollowUps(
        originalRequest, 
        accumulatedContent, 
        findings
      );
      
      setCurrentPlan(prev => prev ? {
        ...prev,
        status: 'completed',
        finalResult,
        followUpSuggestions,
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

// AI-generated progress updates
async function generateProgressUpdate(
  step: DynamicPlanStep, 
  originalRequest: string, 
  currentStep: number, 
  totalSteps: number
): Promise<string> {
  try {
    const modelSettings = getModelSettings();
    
    const prompt = `Generate a brief, natural progress update for what the AI is doing right now.

Current step (${currentStep}/${totalSteps}): ${step.description}
Original request: ${originalRequest}
Tool being used: ${step.tool}

Write a conversational update (1-2 sentences) explaining what the AI is currently doing. Be specific about the action.
Examples: "Searching for the latest tech news to get you current information..." or "Analyzing GitHub repository structure to understand the codebase..."

Keep it natural and engaging.`;

    const { data } = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 100,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel
        })
      }
    });

    return data.message || data.content || `Working on step ${currentStep}: ${step.description}`;
  } catch (error) {
    console.error('Failed to generate progress update:', error);
    return `Working on step ${currentStep}: ${step.description}`;
  }
}

// Enhanced content extraction with AI analysis
async function extractAndAnalyzeContent(result: any, toolType: string, originalRequest: string): Promise<string | null> {
  if (!result) return null;
  
  try {
    let rawContent = '';
    
    if (typeof result === 'string') {
      rawContent = result;
    } else if (result.data && Array.isArray(result.data)) {
      rawContent = result.data.map((item: any) => {
        if (item.title && item.snippet) {
          return `${item.title}: ${item.snippet}`;
        }
        return JSON.stringify(item);
      }).join('\n\n');
    } else if (result.results && Array.isArray(result.results)) {
      rawContent = result.results.map((item: any) => {
        if (item.title && item.snippet) {
          return `${item.title}: ${item.snippet}`;
        }
        return JSON.stringify(item);
      }).join('\n\n');
    } else {
      rawContent = JSON.stringify(result);
    }

    // Use AI to clean and structure the content
    const modelSettings = getModelSettings();
    
    const structurePrompt = `Extract and structure the key information from this ${toolType} result for the request: "${originalRequest}"

Raw data:
${rawContent.substring(0, 2000)}

Please:
1. Extract the most relevant information
2. Organize it clearly
3. Remove noise and irrelevant data
4. Keep important details like sources, dates, etc.

Return clean, structured content:`;

    const { data } = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [{ role: 'user', content: structurePrompt }],
        temperature: 0.3,
        max_tokens: 800,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel
        })
      }
    });

    return data.message || data.content || rawContent;
  } catch (error) {
    console.error('Error extracting and analyzing content:', error);
    return null;
  }
}

// AI-generated step insights
async function generateStepInsight(
  extractedContent: string | null,
  step: DynamicPlanStep,
  originalRequest: string,
  accumulatedContent: string[]
): Promise<string> {
  if (!extractedContent) return "No significant findings from this step.";
  
  try {
    const modelSettings = getModelSettings();
    
    const insightPrompt = `Analyze what was found in this research step and explain its significance.

Original request: ${originalRequest}
Step completed: ${step.description}
New findings: ${extractedContent.substring(0, 500)}
Previous findings: ${accumulatedContent.slice(-2).join(' ').substring(0, 300)}

Write a brief insight (1-2 sentences) explaining:
- What key information was discovered
- How it relates to the user's request
- Why it's valuable

Be conversational and specific.`;

    const { data } = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [{ role: 'user', content: insightPrompt }],
        temperature: 0.6,
        max_tokens: 150,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel
        })
      }
    });

    return data.message || data.content || "Found relevant information for your request.";
  } catch (error) {
    console.error('Failed to generate step insight:', error);
    return "Found relevant information for your request.";
  }
}

// AI-driven intelligent adaptation
async function intelligentAdaptationWithAI(
  originalRequest: string, 
  accumulatedContent: string[], 
  remainingSteps: DynamicPlanStep[],
  findings: Record<string, any>
): Promise<{needsAdaptation: boolean, reasoning: string}> {
  if (accumulatedContent.length === 0) {
    return { needsAdaptation: true, reasoning: 'No content gathered yet, need more targeted searches' };
  }

  try {
    const modelSettings = getModelSettings();
    
    const adaptationPrompt = `Analyze the research progress and determine if we need additional searches.

Original Request: ${originalRequest}
Content Gathered So Far: ${accumulatedContent.join('\n\n').substring(0, 1500)}
Remaining Planned Steps: ${remainingSteps.map(s => s.description).join(', ')}
Findings Summary: ${Object.keys(findings).join(', ')}

Critical Analysis:
1. Do we have sufficient depth and breadth of information?
2. Are there obvious gaps or missing perspectives?
3. Is the information current and comprehensive enough?
4. Would additional targeted searches significantly improve the response?

Respond with JSON: {"needsAdaptation": boolean, "reasoning": "detailed explanation of what's missing or why current info is sufficient"}`;

    const { data } = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [{ role: 'user', content: adaptationPrompt }],
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
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('AI adaptation analysis failed:', error);
  }
  
  return { needsAdaptation: false, reasoning: 'Continue with current plan - sufficient information gathered' };
}

// AI-generated adaptive steps
async function generateAdaptiveStepsWithAI(
  originalRequest: string, 
  accumulatedContent: string[], 
  reasoning: string,
  findings: Record<string, any>
): Promise<DynamicPlanStep[]> {
  try {
    const modelSettings = getModelSettings();
    
    const stepPrompt = `Based on the content analysis, generate 1-2 specific, targeted search queries to fill information gaps.

Original Request: ${originalRequest}
Content So Far: ${accumulatedContent.join('\n').substring(0, 1000)}
Gap Analysis: ${reasoning}
What We Have: ${Object.keys(findings).join(', ')}

Generate highly specific search queries that will add value. Be strategic about what's missing.

Respond with JSON: {"queries": ["very specific query 1", "targeted query 2"]}`;

    const { data } = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [{ role: 'user', content: stepPrompt }],
        temperature: 0.5,
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
      const parsed = JSON.parse(jsonMatch[0]);
      const planId = `adaptive-${Date.now()}`;
      
      return parsed.queries.map((query: string, index: number) => ({
        id: `${planId}-${index + 1}`,
        description: `Targeted search: ${query}`,
        tool: 'execute_web-search',
        parameters: { query },
        status: 'pending' as const
      }));
    }
  } catch (error) {
    console.error('AI adaptive step generation failed:', error);
  }
  
  return [];
}

// Comprehensive synthesis with follow-up suggestions
async function comprehensiveSynthesisWithFollowUps(
  originalRequest: string, 
  accumulatedContent: string[], 
  findings: Record<string, any>
): Promise<{finalResult: string, followUpSuggestions: string[]}> {
  try {
    const modelSettings = getModelSettings();
    
    const synthesisPrompt = `Create a comprehensive response and suggest relevant follow-up actions.

Original Request: ${originalRequest}
All Research Content: ${accumulatedContent.join('\n\n')}
Research Tools Used: ${Object.keys(findings).join(', ')}

Task 1 - Create comprehensive response:
- Organize information by importance and relevance
- Include specific details and sources
- Structure with clear sections
- Be thorough but well-organized
- Include timestamps when available

Task 2 - Suggest 2-3 relevant follow-up actions:
- What could the user explore next?
- What related topics might be interesting?
- What deeper analysis could be valuable?

Format as JSON:
{
  "response": "detailed comprehensive response",
  "followUps": ["Follow-up action 1", "Follow-up action 2", "Follow-up action 3"]
}`;

    const { data } = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [{ role: 'user', content: synthesisPrompt }],
        temperature: 0.4,
        max_tokens: 1500,
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
      return {
        finalResult: parsed.response,
        followUpSuggestions: parsed.followUps || []
      };
    }
  } catch (error) {
    console.error('AI synthesis failed:', error);
  }
  
  return {
    finalResult: `Based on comprehensive research across ${accumulatedContent.length} sources: ${accumulatedContent.join('\n\n')}`,
    followUpSuggestions: []
  };
}

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
