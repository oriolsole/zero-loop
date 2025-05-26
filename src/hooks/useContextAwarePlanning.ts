
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getModelSettings } from '@/services/modelProviderService';

export interface ContextualPlan {
  id: string;
  originalQuery: string;
  planType: 'sequential' | 'parallel' | 'conditional' | 'adaptive';
  executionStrategy: string;
  contextFactors: string[];
  confidenceScore: number;
  estimatedTime: number;
  toolChain: Array<{
    tool: string;
    dependencies: string[];
    conditions: string[];
    priority: number;
  }>;
  adaptationRules: string[];
}

export const useContextAwarePlanning = () => {
  const [currentPlan, setCurrentPlan] = useState<ContextualPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);

  const generateContextualPlan = useCallback(async (
    query: string,
    conversationHistory: any[],
    availableTools: string[]
  ): Promise<ContextualPlan> => {
    setIsPlanning(true);
    
    try {
      const modelSettings = getModelSettings();
      
      const contextAnalysis = analyzeConversationContext(conversationHistory);
      const queryComplexity = assessQueryComplexity(query);
      
      const planningPrompt = `You are an AI planning specialist. Create an optimal execution plan for this query.

Query: "${query}"
Available Tools: ${availableTools.join(', ')}
Conversation Context: ${contextAnalysis.summary}
Query Complexity: ${queryComplexity.level}

Consider:
1. Tool dependencies and optimal sequencing
2. Potential failure points and fallbacks  
3. Context from previous conversation turns
4. Opportunities for parallel execution
5. Adaptive replanning triggers

Respond with JSON:
{
  "planType": "sequential|parallel|conditional|adaptive",
  "executionStrategy": "description of overall approach",
  "contextFactors": ["factor1", "factor2"],
  "confidenceScore": 0.0-1.0,
  "estimatedTime": seconds,
  "toolChain": [
    {
      "tool": "tool_name",
      "dependencies": ["prerequisite_tools"],
      "conditions": ["when to execute"],
      "priority": 1-10
    }
  ],
  "adaptationRules": ["rule1", "rule2"]
}`;

      const { data } = await supabase.functions.invoke('ai-model-proxy', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are a strategic AI planning expert. Respond only in valid JSON format.'
            },
            {
              role: 'user',
              content: planningPrompt
            }
          ],
          temperature: 0.2,
          max_tokens: 800,
          ...(modelSettings && {
            provider: modelSettings.provider,
            model: modelSettings.selectedModel
          })
        }
      });

      const aiResponse = data.message || data.content || '';
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      
      let planData;
      if (jsonMatch) {
        planData = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback plan
        planData = createFallbackPlan(query, availableTools);
      }

      const plan: ContextualPlan = {
        id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        originalQuery: query,
        planType: planData.planType || 'sequential',
        executionStrategy: planData.executionStrategy || 'Standard execution',
        contextFactors: planData.contextFactors || [],
        confidenceScore: planData.confidenceScore || 0.7,
        estimatedTime: planData.estimatedTime || 30,
        toolChain: planData.toolChain || [],
        adaptationRules: planData.adaptationRules || []
      };

      setCurrentPlan(plan);
      return plan;
      
    } catch (error) {
      console.error('Planning failed:', error);
      const fallbackPlan = createFallbackPlan(query, availableTools);
      setCurrentPlan(fallbackPlan);
      return fallbackPlan;
    } finally {
      setIsPlanning(false);
    }
  }, []);

  const adaptPlan = useCallback(async (
    currentPlan: ContextualPlan,
    executionResults: Array<{tool: string, success: boolean, result: any}>,
    remainingTools: string[]
  ): Promise<ContextualPlan> => {
    // Analyze execution results and adapt plan
    const successRate = executionResults.filter(r => r.success).length / executionResults.length;
    
    if (successRate < 0.5) {
      // Significant failures - create new strategy
      const adaptedPlan = await generateContextualPlan(
        currentPlan.originalQuery + ' (adapted strategy)',
        [],
        remainingTools
      );
      
      adaptedPlan.id = currentPlan.id;
      adaptedPlan.planType = 'adaptive';
      
      return adaptedPlan;
    }
    
    // Minor adaptations
    const updatedPlan = { ...currentPlan };
    updatedPlan.confidenceScore = Math.min(1.0, updatedPlan.confidenceScore + 0.1);
    
    return updatedPlan;
  }, [generateContextualPlan]);

  return {
    currentPlan,
    isPlanning,
    generateContextualPlan,
    adaptPlan
  };
};

function analyzeConversationContext(history: any[]): {summary: string, keyTopics: string[], githubRefs: string[]} {
  const summary = history.slice(-3).map(msg => 
    `${msg.role}: ${(msg.content || '').substring(0, 100)}...`
  ).join(' ');
  
  const allContent = history.map(msg => msg.content || '').join(' ');
  
  const githubRefs = (allContent.match(/github\.com\/[\w-]+\/[\w-]+/gi) || []);
  const keyTopics = extractKeyTopics(allContent);
  
  return { summary, keyTopics, githubRefs };
}

function extractKeyTopics(text: string): string[] {
  const topics = [];
  const patterns = [
    /\b(react|vue|angular|node|python|javascript)\b/gi,
    /\b(api|database|auth|login|payment)\b/gi,
    /\b(github|repository|commits|code)\b/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      topics.push(...matches.map(m => m.toLowerCase()));
    }
  });
  
  return [...new Set(topics)].slice(0, 5);
}

function assessQueryComplexity(query: string): {level: 'simple' | 'moderate' | 'complex', factors: string[]} {
  const factors = [];
  let level: 'simple' | 'moderate' | 'complex' = 'simple';
  
  if (query.length > 100) {
    factors.push('Long query');
    level = 'moderate';
  }
  
  if (/\band\b.*\band\b/i.test(query)) {
    factors.push('Multiple requirements');
    level = 'complex';
  }
  
  if (/\b(analyze|compare|comprehensive|detailed)\b/i.test(query)) {
    factors.push('Analytical request');
    level = 'complex';
  }
  
  return { level, factors };
}

function createFallbackPlan(query: string, availableTools: string[]): ContextualPlan {
  return {
    id: `fallback-${Date.now()}`,
    originalQuery: query,
    planType: 'sequential',
    executionStrategy: 'Simple sequential execution with web search primary',
    contextFactors: ['fallback'],
    confidenceScore: 0.6,
    estimatedTime: 20,
    toolChain: [
      {
        tool: 'execute_web-search',
        dependencies: [],
        conditions: ['always'],
        priority: 1
      }
    ],
    adaptationRules: ['If primary tool fails, try knowledge search']
  };
}
