
import { useCallback } from 'react';
import { MultiToolPlan, ToolExecution, GitHubContext, ToolPlanningContext } from '@/types/orchestrator';
import { usePlanDetection } from './usePlanDetection';
import { useToolDependencies } from './useToolDependencies';

export const usePlanCreation = () => {
  const { shouldUseToolsForQuery, detectGitHubRequest, inferToolFromStep } = usePlanDetection();
  const { groupExecutionsByDependencies } = useToolDependencies();

  const createAdvancedPlan = useCallback((context: ToolPlanningContext): MultiToolPlan | null => {
    const { query, suggestedTools, dependencies } = context;
    
    if (!shouldUseToolsForQuery(query)) {
      return null;
    }

    const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let executions: ToolExecution[] = [];
    let title = '';
    let description = '';

    // Create executions based on suggested tools
    if (suggestedTools.length > 0) {
      title = `Multi-Tool Analysis: ${suggestedTools.length} tools`;
      description = `Coordinated execution of ${suggestedTools.join(', ')} for comprehensive results`;
      
      executions = suggestedTools.map((tool, index) => {
        const toolDeps = dependencies[tool] || [];
        
        return {
          id: `${planId}-exec-${index + 1}`,
          tool: `execute_${tool}`,
          description: getToolDescription(tool, query),
          status: 'pending' as const,
          parameters: getToolParameters(tool, query),
          dependencies: [],
          canRunInParallel: true,
          priority: index,
          estimatedDuration: getEstimatedDuration(tool)
        };
      });
    } else {
      // Fallback to single tool
      const githubContext = detectGitHubRequest(query);
      executions = createBasicPlan(query, githubContext, planId);
      title = 'Information Search';
      description = 'Single tool execution';
    }

    // Group executions by dependencies
    const executionGroups = groupExecutionsByDependencies(executions);
    const totalEstimatedTime = executions.reduce((sum, exec) => sum + exec.estimatedDuration, 0);

    return {
      id: planId,
      title,
      description,
      executions,
      executionGroups,
      status: 'pending',
      currentExecutionIndex: 0,
      currentGroupIndex: 0,
      totalEstimatedTime,
      optimizationApplied: executionGroups.length < executions.length
    };
  }, [shouldUseToolsForQuery, detectGitHubRequest, groupExecutionsByDependencies]);

  const createPlan = useCallback((query: string): MultiToolPlan | null => {
    // Analyze query for tool suggestions
    const planningContext = analyzeQueryForTools(query);
    return createAdvancedPlan(planningContext);
  }, [createAdvancedPlan]);

  return { createPlan, createAdvancedPlan };
};

function analyzeQueryForTools(query: string): ToolPlanningContext {
  const lowerQuery = query.toLowerCase();
  const suggestedTools: string[] = [];
  const dependencies: Record<string, string[]> = {};

  // Detect multiple tool patterns
  if (lowerQuery.includes('search') && (lowerQuery.includes('scrape') || lowerQuery.includes('analyze'))) {
    suggestedTools.push('web-search', 'web-scraper');
    dependencies['web-scraper'] = ['web-search'];
  } else if (lowerQuery.includes('github') || lowerQuery.includes('repository')) {
    suggestedTools.push('github-tools');
  } else if (lowerQuery.includes('knowledge') || lowerQuery.includes('documents')) {
    suggestedTools.push('knowledge-search-v2');
  } else if (lowerQuery.includes('search') || lowerQuery.includes('find')) {
    suggestedTools.push('web-search');
  }

  // Add knowledge search for comprehensive queries
  if (lowerQuery.includes('comprehensive') || lowerQuery.includes('detailed') || lowerQuery.includes('analyze')) {
    if (!suggestedTools.includes('knowledge-search-v2')) {
      suggestedTools.push('knowledge-search-v2');
    }
  }

  return {
    query,
    previousResults: {},
    suggestedTools,
    dependencies
  };
}

function createBasicPlan(query: string, githubContext: GitHubContext, planId: string): ToolExecution[] {
  if (githubContext.isGithub) {
    return [{
      id: `${planId}-exec-1`,
      tool: 'execute_github-tools',
      description: 'Fetch repository information',
      status: 'pending',
      parameters: {
        action: 'get_repository',
        owner: githubContext.owner || 'oriolsole',
        repository: githubContext.repo || 'zero-loop'
      },
      dependencies: [],
      canRunInParallel: true,
      priority: 0,
      estimatedDuration: 5
    }];
  }

  return [{
    id: `${planId}-exec-1`,
    tool: 'execute_web-search',
    description: 'Search for information',
    status: 'pending',
    parameters: { query },
    dependencies: [],
    canRunInParallel: true,
    priority: 0,
    estimatedDuration: 6
  }];
}

function getToolDescription(tool: string, query: string): string {
  const descriptions = {
    'web-search': `Search the web for: ${query}`,
    'web-scraper': 'Extract detailed content from search results',
    'knowledge-search-v2': 'Search knowledge base for relevant information',
    'github-tools': 'Analyze GitHub repository',
    'jira-tools': 'Access Jira project information',
    'gmail-tools': 'Access Gmail data'
  };
  
  return descriptions[tool as keyof typeof descriptions] || `Execute ${tool}`;
}

function getToolParameters(tool: string, query: string): Record<string, any> {
  const parameters = {
    'web-search': { query },
    'web-scraper': { url: '', extract_content: true },
    'knowledge-search-v2': { query, limit: 5 },
    'github-tools': { action: 'get_repository' },
    'jira-tools': { action: 'list_projects' },
    'gmail-tools': { action: 'list_emails', maxResults: 5 }
  };
  
  return parameters[tool as keyof typeof parameters] || { query };
}

function getEstimatedDuration(tool: string): number {
  const durations = {
    'web-search': 4,
    'web-scraper': 8,
    'knowledge-search-v2': 3,
    'github-tools': 5,
    'jira-tools': 4,
    'gmail-tools': 3
  };
  
  return durations[tool as keyof typeof durations] || 5;
}
