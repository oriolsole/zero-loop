
import { useCallback } from 'react';
import { GitHubContext } from '@/types/orchestrator';

export const usePlanDetection = () => {
  const shouldUseToolsForQuery = useCallback((query: string): boolean => {
    const lowerQuery = query.toLowerCase().trim();
    
    // Don't use tools for basic greetings or system queries
    const systemQueries = [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'what can you do', 'help me', 'thanks', 'thank you'
    ];
    
    if (systemQueries.some(q => lowerQuery === q || lowerQuery.startsWith(q + ' '))) {
      return false;
    }
    
    // Use tools for specific information requests
    const toolIndicators = [
      'search', 'find', 'look up', 'github', 'repository', 'repo',
      'latest', 'current', 'news', 'what is', 'who is', 'how to',
      'analyze', 'examine', 'check', 'show me', 'tell me about'
    ];
    
    return toolIndicators.some(indicator => lowerQuery.includes(indicator));
  }, []);

  const detectGitHubRequest = useCallback((query: string): GitHubContext => {
    const lowerQuery = query.toLowerCase();
    
    // Check for GitHub URL
    const githubUrlMatch = query.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)/i);
    if (githubUrlMatch) {
      return {
        isGithub: true,
        owner: githubUrlMatch[1],
        repo: githubUrlMatch[2],
        action: 'get_repository'
      };
    }
    
    // Check for repository name patterns
    const repoNameMatch = query.match(/\b([\w-]+\/[\w-]+)\b/);
    if (repoNameMatch && (lowerQuery.includes('repo') || lowerQuery.includes('github'))) {
      const [owner, repo] = repoNameMatch[1].split('/');
      return {
        isGithub: true,
        owner,
        repo,
        action: 'get_repository'
      };
    }
    
    // Check for commit-related requests
    if (lowerQuery.includes('commit') || lowerQuery.includes('latest')) {
      return {
        isGithub: true,
        action: 'get_commits'
      };
    }
    
    // Check for general GitHub keywords
    const githubKeywords = ['github', 'repository', 'repo', 'branch', 'pull request', 'pr'];
    if (githubKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return { isGithub: true };
    }
    
    return { isGithub: false };
  }, []);

  const inferToolFromStep = useCallback((step: string, context?: any): string => {
    const lowerStep = step.toLowerCase();
    
    // GitHub-specific tool inference
    if (context?.isGithub || lowerStep.includes('github') || lowerStep.includes('repository') || lowerStep.includes('repo') || lowerStep.includes('commit')) {
      return 'execute_github-tools';
    }
    
    // Knowledge base search
    if (lowerStep.includes('knowledge') || lowerStep.includes('my notes') || lowerStep.includes('remember')) {
      return 'execute_knowledge-search-v2';
    }
    
    // Web search for everything else
    return 'execute_web-search';
  }, []);

  return {
    shouldUseToolsForQuery,
    detectGitHubRequest,
    inferToolFromStep
  };
};
