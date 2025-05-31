
import { useCallback } from 'react';
import { MultiToolPlan, ToolExecution, GitHubContext } from '@/types/orchestrator';
import { usePlanDetection } from './usePlanDetection';

export const usePlanCreation = () => {
  const { shouldUseToolsForQuery, detectGitHubRequest, inferToolFromStep } = usePlanDetection();

  const createPlan = useCallback((query: string): MultiToolPlan | null => {
    if (!shouldUseToolsForQuery(query)) {
      return null;
    }

    const githubContext = detectGitHubRequest(query);
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let executions: ToolExecution[] = [];
    let title = '';
    let description = '';

    if (githubContext.isGithub) {
      // GitHub-specific plan
      if (query.toLowerCase().includes('latest commit') || query.toLowerCase().includes('commits')) {
        title = 'GitHub Repository Commits';
        description = 'Fetching latest commits from repository';
        executions = [
          {
            id: `${planId}-exec-1`,
            tool: 'execute_github-tools',
            description: 'Fetch latest commits',
            status: 'pending',
            parameters: {
              action: 'get_commits',
              owner: githubContext.owner || 'oriolsole',
              repository: githubContext.repo || 'zero-loop'
            },
            estimatedDuration: 5
          }
        ];
      } else {
        title = 'GitHub Repository Analysis';
        description = 'Analyzing repository information';
        executions = [
          {
            id: `${planId}-exec-1`,
            tool: 'execute_github-tools',
            description: 'Fetch repository information',
            status: 'pending',
            parameters: {
              action: 'get_repository',
              owner: githubContext.owner || 'oriolsole',
              repository: githubContext.repo || 'zero-loop'
            },
            estimatedDuration: 5
          }
        ];
      }
    } else {
      // General search plan
      title = 'Information Search';
      description = 'Searching for requested information';
      executions = [
        {
          id: `${planId}-exec-1`,
          tool: inferToolFromStep(query),
          description: 'Search for information',
          status: 'pending',
          parameters: { query },
          estimatedDuration: 6
        }
      ];
    }

    const totalEstimatedTime = executions.reduce((sum, exec) => sum + exec.estimatedDuration, 0);

    return {
      id: planId,
      title,
      description,
      executions,
      status: 'pending',
      currentExecutionIndex: 0,
      totalEstimatedTime
    };
  }, [shouldUseToolsForQuery, detectGitHubRequest, inferToolFromStep]);

  return { createPlan };
};
