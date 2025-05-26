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

// Add function to detect if query needs tools
function shouldUseToolsForQuery(query: string, conversationHistory: any[] = []): boolean {
  const lowerQuery = query.toLowerCase().trim();
  
  // Simple greetings and conversational responses - no tools needed
  const conversationalPatterns = [
    /^(hi|hello|hey|greetings?)!?$/i,
    /^(how are you|what's up|sup)\??$/i,
    /^(thanks?|thank you|thx)!?$/i,
    /^(bye|goodbye|see you)!?$/i,
    /^(yes|no|ok|okay|sure)!?$/i
  ];
  
  if (conversationalPatterns.some(pattern => pattern.test(lowerQuery))) {
    return false;
  }
  
  // System/app related questions - can be answered directly
  const systemQuestions = [
    /what tools (do we have|are available)/i,
    /what can you do/i,
    /how does this work/i,
    /what is this/i
  ];
  
  if (systemQuestions.some(pattern => pattern.test(lowerQuery))) {
    return false;
  }
  
  // Only use tools for queries that genuinely need external information
  const toolRequiredPatterns = [
    /search|find|look up|get information about/i,
    /latest|current|recent|news/i,
    /github\.com\/[\w-]+\/[\w-]+/i,
    /https?:\/\/[^\s]+/i,
    /my knowledge|knowledge base/i
  ];
  
  return toolRequiredPatterns.some(pattern => pattern.test(query));
}

export const useMultiToolOrchestrator = () => {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<OrchestrationPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const createOrchestrationPlan = useCallback(async (
    query: string,
    conversationHistory: any[] = []
  ): Promise<OrchestrationPlan> => {
    // Check if tools are actually needed
    if (!shouldUseToolsForQuery(query, conversationHistory)) {
      // Return minimal plan for direct response
      const plan: OrchestrationPlan = {
        id: `orchestration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        originalQuery: query,
        extractedQuery: {
          cleanedQuery: query,
          toolSpecificParams: {},
          confidence: 0.9,
          queryType: 'general',
          entities: []
        },
        toolExecutions: [],
        currentExecutionIndex: 0,
        status: 'planning',
        adaptations: 0,
        contextMemory: {}
      };
      
      setCurrentPlan(plan);
      return plan;
    }
    
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
    // If no tools needed, complete immediately
    if (plan.toolExecutions.length === 0) {
      const directResponse = generateDirectResponse(plan.originalQuery);
      plan.finalResult = directResponse;
      plan.status = 'completed';
      onPlanComplete(directResponse);
      setCurrentPlan(plan);
      return;
    }
    
    setIsExecuting(true);
    let updatedPlan = { ...plan, status: 'executing' as const };
    
    try {
      for (let i = 0; i < updatedPlan.toolExecutions.length; i++) {
        const execution = updatedPlan.toolExecutions[i];
        
        // Create new object for executing status
        const startedExecution: ToolExecution = {
          id: execution.id,
          toolName: execution.toolName,
          parameters: execution.parameters,
          status: 'executing',
          confidence: execution.confidence,
          startTime: new Date().toISOString()
        };
        
        onToolUpdate(startedExecution);
        
        try {
          const result = await executeToolWithIntelligentParams(
            execution.toolName,
            execution.parameters,
            updatedPlan.contextMemory
          );
          
          // Create new object for completed status
          const completedExecution: ToolExecution = {
            id: execution.id,
            toolName: execution.toolName,
            parameters: execution.parameters,
            status: 'completed',
            result,
            confidence: execution.confidence,
            startTime: startedExecution.startTime,
            endTime: new Date().toISOString()
          };
          
          onToolUpdate(completedExecution);
          updatedPlan.contextMemory[execution.toolName] = result;
          
          // Check if we need to adapt the plan based on results
          const adaptation = await assessNeedForAdaptation(updatedPlan, result, i);
          
          if (adaptation.needsAdaptation) {
            const newExecutions = await generateAdaptiveExecutions(updatedPlan, adaptation.reasoning);
            updatedPlan.toolExecutions.push(...newExecutions);
            updatedPlan.adaptations++;
          }
          
        } catch (error) {
          // Create new object for failed status
          const failedExecution: ToolExecution = {
            id: execution.id,
            toolName: execution.toolName,
            parameters: execution.parameters,
            status: 'failed',
            error: error.message,
            confidence: execution.confidence,
            startTime: startedExecution.startTime,
            endTime: new Date().toISOString()
          };
          
          onToolUpdate(failedExecution);
          
          // Try fallback strategy
          const fallbackResult = await attemptFallbackStrategy(execution, error, updatedPlan.contextMemory);
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

// Generate direct response for queries that don't need tools
function generateDirectResponse(query: string): string {
  const lowerQuery = query.toLowerCase().trim();
  
  if (/^(hi|hello|hey|greetings?)!?$/i.test(lowerQuery)) {
    return "Hello! I'm your AI assistant. I can help you search for information, analyze GitHub repositories, and access your knowledge base. What would you like to know?";
  }
  
  if (/what tools (do we have|are available)/i.test(lowerQuery)) {
    return `I have access to several tools:

**🔍 Web Search** - Search the internet for current information
**📚 Knowledge Search** - Search through your personal knowledge base and stored documents  
**🔧 GitHub Tools** - Analyze repositories, view commits, files, and project structure
**🌐 Web Scraper** - Extract detailed content from specific URLs

I only use these tools when you need external information or specific data. For general conversation and questions about the system itself, I can respond directly.

What would you like to help you with?`;
  }
  
  if (/what can you do/i.test(lowerQuery)) {
    return "I can help you with:\n\n• Searching for information on the web\n• Finding content in your knowledge base\n• Analyzing GitHub repositories\n• Extracting content from websites\n• Answering questions and having conversations\n\nI'm designed to be smart about when to use tools - I only fetch external data when it's actually needed for your request.";
  }
  
  return "I'm here to help! You can ask me questions, search for information, analyze code repositories, or explore your knowledge base. What would you like to do?";
}

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
