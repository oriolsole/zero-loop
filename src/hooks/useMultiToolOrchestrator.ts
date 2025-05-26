
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getModelSettings } from '@/services/modelProviderService';
import { useAuth } from '@/contexts/AuthContext';
import { extractIntelligentQuery, ExtractedQuery } from '@/utils/intelligentQueryExtraction';

export interface ToolExecution {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  confidence: number;
  startTime?: string;
  endTime?: string;
}

export interface OrchestrationPlan {
  id: string;
  originalQuery: string;
  extractedQuery: ExtractedQuery;
  toolExecutions: ToolExecution[];
  currentExecutionIndex: number;
  status: 'planning' | 'executing' | 'completed' | 'failed';
  adaptations: number;
  finalResult?: string;
  contextMemory: Record<string, any>;
}

export const useMultiToolOrchestrator = () => {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<OrchestrationPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const createOrchestrationPlan = useCallback(async (
    query: string,
    conversationHistory: any[] = []
  ): Promise<OrchestrationPlan> => {
    const extractedQuery = extractIntelligentQuery(query, conversationHistory);
    
    const toolExecutions = await generateOptimalToolSequence(extractedQuery);
    
    const plan: OrchestrationPlan = {
      id: `orchestration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      originalQuery: query,
      extractedQuery,
      toolExecutions,
      currentExecutionIndex: 0,
      status: 'planning',
      adaptations: 0,
      contextMemory: {}
    };

    setCurrentPlan(plan);
    return plan;
  }, []);

  const executeOrchestrationPlan = useCallback(async (
    plan: OrchestrationPlan,
    onToolUpdate: (execution: ToolExecution) => void,
    onPlanComplete: (result: string) => void
  ) => {
    setIsExecuting(true);
    let updatedPlan = { ...plan, status: 'executing' as const };
    
    try {
      for (let i = 0; i < updatedPlan.toolExecutions.length; i++) {
        const execution = updatedPlan.toolExecutions[i];
        
        const startedExecution: ToolExecution = {
          ...execution,
          status: 'executing',
          startTime: new Date().toISOString()
        };
        
        onToolUpdate(startedExecution);
        
        try {
          const result = await executeToolWithIntelligentParams(
            execution.toolName,
            execution.parameters,
            updatedPlan.contextMemory
          );
          
          const completedExecution: ToolExecution = {
            ...startedExecution,
            status: 'completed',
            result,
            endTime: new Date().toISOString()
          };
          
          onToolUpdate(completedExecution);
          
          // Update context memory with results
          updatedPlan.contextMemory[execution.toolName] = result;
          
          // Check if we need to adapt the plan based on results
          const adaptation = await assessNeedForAdaptation(
            updatedPlan,
            result,
            i
          );
          
          if (adaptation.needsAdaptation) {
            const newExecutions = await generateAdaptiveExecutions(
              updatedPlan,
              adaptation.reasoning
            );
            
            updatedPlan.toolExecutions.push(...newExecutions);
            updatedPlan.adaptations++;
          }
          
        } catch (error) {
          const failedExecution: ToolExecution = {
            ...startedExecution,
            status: 'failed',
            error: error.message,
            endTime: new Date().toISOString()
          };
          
          onToolUpdate(failedExecution);
          
          // Try fallback strategy
          const fallbackResult = await attemptFallbackStrategy(
            execution,
            error,
            updatedPlan.contextMemory
          );
          
          if (fallbackResult) {
            updatedPlan.contextMemory[execution.toolName] = fallbackResult;
          }
        }
      }
      
      // Synthesize final result
      const finalResult = await synthesizeMultiToolResults(
        updatedPlan.originalQuery,
        updatedPlan.contextMemory,
        updatedPlan.extractedQuery
      );
      
      updatedPlan.finalResult = finalResult;
      updatedPlan.status = 'completed';
      
      onPlanComplete(finalResult);
      
    } catch (error) {
      updatedPlan.status = 'failed';
      throw error;
    } finally {
      setIsExecuting(false);
      setCurrentPlan(updatedPlan);
    }
  }, [user]);

  return {
    currentPlan,
    isExecuting,
    createOrchestrationPlan,
    executeOrchestrationPlan
  };
};

async function generateOptimalToolSequence(extractedQuery: ExtractedQuery): Promise<ToolExecution[]> {
  const executions: ToolExecution[] = [];
  
  // Primary tool execution based on query type
  const primaryTool = getPrimaryToolForQueryType(extractedQuery.queryType);
  const primaryParams = extractedQuery.toolSpecificParams[primaryTool] || {};
  
  executions.push({
    id: `exec-primary-${Date.now()}`,
    toolName: primaryTool,
    parameters: primaryParams,
    status: 'pending',
    confidence: extractedQuery.confidence
  });
  
  // Add complementary tools for comprehensive results
  const complementaryTools = getComplementaryTools(extractedQuery.queryType, extractedQuery.entities);
  
  complementaryTools.forEach((tool, index) => {
    executions.push({
      id: `exec-comp-${index}-${Date.now()}`,
      toolName: tool.name,
      parameters: tool.params,
      status: 'pending',
      confidence: tool.confidence
    });
  });
  
  return executions;
}

function getPrimaryToolForQueryType(queryType: ExtractedQuery['queryType']): string {
  switch (queryType) {
    case 'github': return 'execute_github-tools';
    case 'search': return 'execute_web-search';
    case 'knowledge': return 'execute_knowledge-search-v2';
    case 'scrape': return 'execute_web-scraper';
    default: return 'execute_web-search';
  }
}

function getComplementaryTools(queryType: ExtractedQuery['queryType'], entities: string[]): Array<{name: string, params: any, confidence: number}> {
  const tools = [];
  
  // Add knowledge search as complementary for most queries
  if (queryType !== 'knowledge') {
    tools.push({
      name: 'execute_knowledge-search-v2',
      params: { query: entities.join(' '), limit: 3 },
      confidence: 0.6
    });
  }
  
  // Add web search for GitHub queries to get additional context
  if (queryType === 'github') {
    tools.push({
      name: 'execute_web-search',
      params: { query: entities.join(' ') + ' recent updates', limit: 3 },
      confidence: 0.7
    });
  }
  
  return tools;
}

async function executeToolWithIntelligentParams(
  toolName: string,
  parameters: Record<string, any>,
  contextMemory: Record<string, any>
): Promise<any> {
  // Enhanced parameters with context
  const enhancedParams = enhanceParametersWithContext(parameters, contextMemory);
  
  const { data, error } = await supabase.functions.invoke('ai-agent', {
    body: {
      message: `Execute ${toolName} with enhanced parameters`,
      conversationHistory: [],
      userId: 'system',
      sessionId: `orchestration-${Date.now()}`,
      streaming: false,
      forcedTool: toolName,
      toolParameters: enhancedParams
    }
  });

  if (error) {
    throw new Error(`Tool execution failed: ${error.message}`);
  }

  return data.message || data.toolResults || `Executed ${toolName} successfully`;
}

function enhanceParametersWithContext(
  params: Record<string, any>,
  contextMemory: Record<string, any>
): Record<string, any> {
  const enhanced = { ...params };
  
  // Add context from previous tool results if relevant
  if (contextMemory['execute_github-tools'] && !enhanced.owner) {
    // Try to extract repo info from previous GitHub results
    const githubResult = contextMemory['execute_github-tools'];
    if (typeof githubResult === 'string') {
      const match = githubResult.match(/github\.com\/([\w-]+)\/([\w-]+)/);
      if (match) {
        enhanced.owner = match[1];
        enhanced.repository = match[2];
      }
    }
  }
  
  return enhanced;
}

async function assessNeedForAdaptation(
  plan: OrchestrationPlan,
  latestResult: any,
  executionIndex: number
): Promise<{needsAdaptation: boolean, reasoning: string}> {
  // Simple heuristics for now - can be enhanced with AI
  if (executionIndex === 0 && (!latestResult || latestResult.length < 100)) {
    return {
      needsAdaptation: true,
      reasoning: 'Primary tool result insufficient, need additional sources'
    };
  }
  
  return {
    needsAdaptation: false,
    reasoning: 'Results appear sufficient'
  };
}

async function generateAdaptiveExecutions(
  plan: OrchestrationPlan,
  reasoning: string
): Promise<ToolExecution[]> {
  // Generate additional tool executions based on gaps
  const adaptiveExecutions: ToolExecution[] = [];
  
  if (reasoning.includes('insufficient')) {
    // Add more comprehensive search
    adaptiveExecutions.push({
      id: `adaptive-${Date.now()}`,
      toolName: 'execute_web-search',
      parameters: {
        query: plan.extractedQuery.cleanedQuery + ' comprehensive guide',
        limit: 5
      },
      status: 'pending',
      confidence: 0.8
    });
  }
  
  return adaptiveExecutions;
}

async function attemptFallbackStrategy(
  execution: ToolExecution,
  error: Error,
  contextMemory: Record<string, any>
): Promise<any> {
  console.log(`Fallback strategy for ${execution.toolName}:`, error.message);
  
  // Simple fallback - try web search instead
  if (execution.toolName !== 'execute_web-search') {
    try {
      return await executeToolWithIntelligentParams(
        'execute_web-search',
        { query: JSON.stringify(execution.parameters) },
        contextMemory
      );
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return null;
    }
  }
  
  return null;
}

async function synthesizeMultiToolResults(
  originalQuery: string,
  contextMemory: Record<string, any>,
  extractedQuery: ExtractedQuery
): Promise<string> {
  const modelSettings = getModelSettings();
  
  const toolResults = Object.entries(contextMemory)
    .map(([tool, result]) => `${tool}: ${typeof result === 'string' ? result.substring(0, 500) : JSON.stringify(result)}`)
    .join('\n\n');

  const synthesisPrompt = `Create a comprehensive response using results from multiple AI tools.

Original Query: ${originalQuery}
Query Type: ${extractedQuery.queryType}
Entities Found: ${extractedQuery.entities.join(', ')}

Multi-Tool Results:
${toolResults}

Instructions:
1. Synthesize information from all tool results
2. Prioritize the most relevant and recent information
3. Structure the response clearly with sections
4. Include specific details and sources when available
5. Address the original query directly and completely

Response:`;

  try {
    const { data } = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: [{ role: 'user', content: synthesisPrompt }],
        temperature: 0.3,
        max_tokens: 1000,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel
        })
      }
    });

    return data.message || data.content || 'Successfully executed multi-tool workflow.';
  } catch (error) {
    console.error('Synthesis failed:', error);
    return `Multi-tool execution completed. Results: ${toolResults}`;
  }
}
