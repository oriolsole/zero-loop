
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getModelSettings } from '@/services/modelProviderService';

export interface AIPlanDetectionResult {
  shouldUsePlan: boolean;
  planType: string;
  confidence: number;
  reasoning: string;
  suggestedSteps: string[];
  context?: any;
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export const useAIPlanDetector = () => {
  const detectPlan = useCallback(async (
    message: string, 
    conversationHistory: any[] = []
  ): Promise<AIPlanDetectionResult> => {
    try {
      // Quick GitHub detection to prevent wrong plan types
      const githubPattern = /github\.com\/([^\/\s]+)\/([^\/\s]+)|latest commit|repository|repo/i;
      const isGitHubRequest = githubPattern.test(message);
      
      if (isGitHubRequest) {
        // For GitHub requests, create specific GitHub plans
        if (message.toLowerCase().includes('latest commit')) {
          return {
            shouldUsePlan: true,
            planType: 'github-commits',
            confidence: 0.95,
            reasoning: 'GitHub commit history request detected',
            suggestedSteps: ['Fetch latest commits from repository'],
            estimatedComplexity: 'simple'
          };
        }
        
        return {
          shouldUsePlan: true,
          planType: 'github-repository',
          confidence: 0.9,
          reasoning: 'GitHub repository analysis request detected',
          suggestedSteps: ['Analyze repository information', 'Fetch repository details'],
          estimatedComplexity: 'moderate'
        };
      }

      const modelSettings = getModelSettings();
      
      // Create a context-aware prompt for plan detection
      const contextSummary = conversationHistory.slice(-3).map(item => 
        `${item.role}: ${item.content.substring(0, 100)}...`
      ).join('\n');

      const planDetectionPrompt = `You are an AI planning assistant. Analyze this user request and determine if it requires a multi-step plan.

User Request: "${message}"

Recent Context:
${contextSummary}

Respond with a JSON object containing:
{
  "shouldUsePlan": boolean,
  "planType": "descriptive-name-for-plan-type",
  "confidence": 0.0-1.0,
  "reasoning": "why this does/doesn't need a plan",
  "suggestedSteps": ["step 1", "step 2", ...],
  "estimatedComplexity": "simple|moderate|complex"
}

Guidelines:
- Use plans for: comprehensive research, multi-source data gathering, complex analysis
- Single responses for: simple questions, basic explanations, direct answers
- Consider available tools: web search, GitHub analysis, knowledge base search
- Maximum 3 steps per plan for efficiency
- Each step should be specific and actionable
- Avoid plans for basic greetings or simple queries`;

      const { data, error } = await supabase.functions.invoke('ai-model-proxy', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are a planning assistant that responds only in valid JSON format. Be concise and practical.'
            },
            {
              role: 'user',
              content: planDetectionPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500,
          ...(modelSettings && {
            provider: modelSettings.provider,
            model: modelSettings.selectedModel,
            localModelUrl: modelSettings.localModelUrl
          })
        }
      });

      if (error) {
        console.error('AI plan detection failed:', error);
        return createFallbackPlan(message);
      }

      // Parse the AI response
      const aiResponse = data.message || data.content || '';
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const planData = JSON.parse(jsonMatch[0]);
        return {
          shouldUsePlan: planData.shouldUsePlan || false,
          planType: planData.planType || 'general-task',
          confidence: planData.confidence || 0.5,
          reasoning: planData.reasoning || 'AI-determined plan requirement',
          suggestedSteps: planData.suggestedSteps || [],
          estimatedComplexity: planData.estimatedComplexity || 'moderate'
        };
      }

      return createFallbackPlan(message);

    } catch (error) {
      console.error('Error in AI plan detection:', error);
      return createFallbackPlan(message);
    }
  }, []);

  return { detectPlan };
};

function createFallbackPlan(message: string): AIPlanDetectionResult {
  const lowerMessage = message.toLowerCase();
  
  // GitHub-specific fallback
  if (lowerMessage.includes('github') || lowerMessage.includes('repository') || lowerMessage.includes('repo')) {
    if (lowerMessage.includes('commit')) {
      return {
        shouldUsePlan: true,
        planType: 'github-commits',
        confidence: 0.8,
        reasoning: 'Fallback: GitHub commit request detected',
        suggestedSteps: ['Fetch repository commits'],
        estimatedComplexity: 'simple'
      };
    }
    
    return {
      shouldUsePlan: true,
      planType: 'github-repository',
      confidence: 0.7,
      reasoning: 'Fallback: GitHub repository request detected',
      suggestedSteps: ['Analyze repository'],
      estimatedComplexity: 'simple'
    };
  }
  
  // Simple heuristics as fallback
  if (lowerMessage.includes('news') || lowerMessage.includes('latest')) {
    return {
      shouldUsePlan: true,
      planType: 'news-search',
      confidence: 0.7,
      reasoning: 'Fallback: News request detected',
      suggestedSteps: ['Search current news'],
      estimatedComplexity: 'simple'
    };
  }

  if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
    return {
      shouldUsePlan: true,
      planType: 'research-task',
      confidence: 0.6,
      reasoning: 'Fallback: Search request detected',
      suggestedSteps: ['Perform web search'],
      estimatedComplexity: 'simple'
    };
  }

  return {
    shouldUsePlan: false,
    planType: 'single-response',
    confidence: 0.8,
    reasoning: 'Fallback: Simple question requiring direct response',
    suggestedSteps: [],
    estimatedComplexity: 'simple'
  };
}
