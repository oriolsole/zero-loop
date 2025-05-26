
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
- Use plans for: comprehensive research, multi-source data gathering, complex analysis, breaking news searches, repository deep-dives
- Single responses for: simple questions, basic explanations, direct answers
- Consider available tools: web search, GitHub analysis, knowledge base search
- Maximum 5 steps per plan
- Each step should be specific and actionable`;

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
  
  // Simple heuristics as fallback
  if (lowerMessage.includes('news') || lowerMessage.includes('latest')) {
    return {
      shouldUsePlan: true,
      planType: 'news-search',
      confidence: 0.7,
      reasoning: 'Fallback: News request detected',
      suggestedSteps: ['Search current news', 'Organize findings'],
      estimatedComplexity: 'moderate'
    };
  }

  if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
    return {
      shouldUsePlan: true,
      planType: 'research-task',
      confidence: 0.6,
      reasoning: 'Fallback: Search request detected',
      suggestedSteps: ['Perform web search', 'Synthesize results'],
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
