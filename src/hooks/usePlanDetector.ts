
import { useCallback } from 'react';

export interface PlanDetectionResult {
  shouldUsePlan: boolean;
  planType: string;
  confidence: number;
  reasoning: string;
  context?: any;
}

export const usePlanDetector = () => {
  const detectPlan = useCallback((message: string, conversationHistory: any[] = []): PlanDetectionResult => {
    const lowerMessage = message.toLowerCase();
    
    // News and current events patterns
    const newsPatterns = [
      /\b(news|headlines|breaking|current events|today'?s news|latest news)\b/i,
      /\bwhat'?s happening (today|now|in the world)\b/i,
      /\b(update me|catch me up) on\b/i,
      /\btell me about (today'?s|recent|latest) (news|events)\b/i
    ];

    // Repository analysis patterns
    const repoPatterns = [
      /\bwhat is this (repo|repository) about\b/i,
      /\bexplain this (repo|repository|project)\b/i,
      /\banalyze this (repo|repository|codebase)\b/i,
      /\btell me about this (repo|repository|project)\b/i,
      /\b(overview|summary) of this (repo|repository)\b/i
    ];

    // Comprehensive research patterns
    const researchPatterns = [
      /\bresearch\b.*\b(comprehensive|thorough|detailed|in-depth)\b/i,
      /\b(comprehensive|thorough|detailed) (analysis|overview|summary)\b/i,
      /\btell me everything about\b/i,
      /\bi want to know (everything|all|more) about\b/i,
      /\bgive me a (complete|full|comprehensive) (overview|analysis)\b/i
    ];

    // Check for GitHub context
    const githubContext = extractGitHubContext(message, conversationHistory);

    // News detection
    if (newsPatterns.some(pattern => pattern.test(message))) {
      return {
        shouldUsePlan: true,
        planType: 'news-search',
        confidence: 0.9,
        reasoning: 'News request detected - will search multiple news categories for comprehensive coverage'
      };
    }

    // Repository analysis detection
    if (repoPatterns.some(pattern => pattern.test(message)) && githubContext) {
      return {
        shouldUsePlan: true,
        planType: 'repo-analysis',
        confidence: 0.95,
        reasoning: 'Repository analysis request detected - will perform comprehensive repo examination',
        context: githubContext
      };
    }

    // Comprehensive research detection
    if (researchPatterns.some(pattern => pattern.test(message))) {
      return {
        shouldUsePlan: true,
        planType: 'comprehensive-search',
        confidence: 0.8,
        reasoning: 'Comprehensive research request detected - will search multiple sources'
      };
    }

    // Complex query detection (multiple questions or broad topics)
    const questionCount = (message.match(/\?/g) || []).length;
    const complexityIndicators = [
      /\band\b.*\band\b/i, // Multiple "and" conjunctions
      /\balso\b/i,
      /\badditionally\b/i,
      /\bfurthermore\b/i,
      /\bmoreover\b/i
    ];

    if (questionCount > 1 || complexityIndicators.some(pattern => pattern.test(message))) {
      return {
        shouldUsePlan: true,
        planType: 'comprehensive-search',
        confidence: 0.7,
        reasoning: 'Complex multi-part query detected - will break down into multiple searches'
      };
    }

    // No planning needed
    return {
      shouldUsePlan: false,
      planType: 'single-step',
      confidence: 0.6,
      reasoning: 'Simple query that can be handled with single tool execution'
    };
  }, []);

  return { detectPlan };
};

function extractGitHubContext(message: string, conversationHistory: any[]): any {
  // Check current message for GitHub URL
  const githubUrlMatch = message.match(/github\.com\/([\w-]+)\/([\w-]+)/i);
  if (githubUrlMatch) {
    return {
      owner: githubUrlMatch[1],
      repo: githubUrlMatch[2]
    };
  }

  // Check conversation history for GitHub context
  const recentHistory = conversationHistory.slice(-10);
  for (const item of recentHistory) {
    if (item.content) {
      const historyMatch = item.content.match(/github\.com\/([\w-]+)\/([\w-]+)/i);
      if (historyMatch) {
        return {
          owner: historyMatch[1],
          repo: historyMatch[2]
        };
      }
    }
  }

  return null;
}
