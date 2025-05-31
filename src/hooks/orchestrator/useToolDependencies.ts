
import { useCallback } from 'react';
import { ToolExecution, ToolDependency } from '@/types/orchestrator';

export const useToolDependencies = () => {
  const detectDependencies = useCallback((executions: ToolExecution[]): ToolExecution[] => {
    const updatedExecutions = [...executions];
    
    // Define tool dependency patterns
    const dependencyPatterns = {
      'execute_web-search': {
        canRunInParallel: true,
        providesContext: ['searchResults', 'urls', 'content']
      },
      'execute_knowledge-search-v2': {
        canRunInParallel: true,
        providesContext: ['knowledgeResults', 'insights']
      },
      'execute_github-tools': {
        canRunInParallel: true,
        providesContext: ['repositoryInfo', 'fileContent', 'commits']
      },
      'execute_web-scraper': {
        dependsOn: ['execute_web-search'],
        canRunInParallel: false,
        needsInput: ['url']
      },
      'execute_jira-tools': {
        canRunInParallel: true,
        providesContext: ['issues', 'projects']
      },
      'execute_gmail-tools': {
        canRunInParallel: true,
        providesContext: ['emails', 'threads']
      }
    };

    // Detect dependencies between tools
    updatedExecutions.forEach((execution, index) => {
      const pattern = dependencyPatterns[execution.tool as keyof typeof dependencyPatterns];
      
      if (pattern) {
        execution.canRunInParallel = pattern.canRunInParallel ?? true;
        execution.priority = index;
        execution.dependencies = execution.dependencies || [];

        // Check if this tool needs input from previous tools
        if (pattern.dependsOn) {
          pattern.dependsOn.forEach(dependencyTool => {
            const dependencyExecution = updatedExecutions.find(e => e.tool === dependencyTool);
            if (dependencyExecution && pattern.needsInput) {
              pattern.needsInput.forEach(inputParam => {
                execution.dependencies.push({
                  toolId: dependencyExecution.id,
                  parameter: inputParam,
                  sourceParameter: 'result'
                });
              });
              execution.canRunInParallel = false;
            }
          });
        }

        // Auto-detect URL dependencies for web scraper
        if (execution.tool === 'execute_web-scraper' && !execution.parameters.url) {
          const searchExecution = updatedExecutions.find(e => e.tool === 'execute_web-search');
          if (searchExecution) {
            execution.dependencies.push({
              toolId: searchExecution.id,
              parameter: 'url',
              sourceParameter: 'urls[0]'
            });
            execution.canRunInParallel = false;
          }
        }
      }
    });

    return updatedExecutions;
  }, []);

  const groupExecutionsByDependencies = useCallback((executions: ToolExecution[]): ToolExecution[][] => {
    const groups: ToolExecution[][] = [];
    const processed = new Set<string>();
    const executionsWithDeps = detectDependencies(executions);

    // Group tools that can run in parallel
    while (processed.size < executionsWithDeps.length) {
      const currentGroup: ToolExecution[] = [];

      executionsWithDeps.forEach(execution => {
        if (processed.has(execution.id)) return;

        // Check if all dependencies are satisfied
        const dependenciesSatisfied = execution.dependencies.every(dep => 
          processed.has(dep.toolId)
        );

        if (dependenciesSatisfied) {
          currentGroup.push(execution);
        }
      });

      if (currentGroup.length === 0) {
        // Break circular dependencies by taking the first unprocessed item
        const remaining = executionsWithDeps.find(e => !processed.has(e.id));
        if (remaining) {
          currentGroup.push(remaining);
        }
      }

      currentGroup.forEach(execution => processed.add(execution.id));
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
    }

    return groups;
  }, [detectDependencies]);

  const injectDependencyParameters = useCallback((
    execution: ToolExecution,
    completedExecutions: Map<string, ToolExecution>
  ): ToolExecution => {
    if (!execution.dependencies.length) return execution;

    const updatedParameters = { ...execution.parameters };

    execution.dependencies.forEach(dependency => {
      const sourceExecution = completedExecutions.get(dependency.toolId);
      if (sourceExecution?.result) {
        // Extract value using dot notation
        const value = getNestedValue(sourceExecution.result, dependency.sourceParameter || 'result');
        if (value !== undefined) {
          updatedParameters[dependency.parameter] = value;
        }
      }
    });

    return {
      ...execution,
      parameters: updatedParameters
    };
  }, []);

  return {
    detectDependencies,
    groupExecutionsByDependencies,
    injectDependencyParameters
  };
};

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    if (key.includes('[') && key.includes(']')) {
      const arrayKey = key.substring(0, key.indexOf('['));
      const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
      return current?.[arrayKey]?.[index];
    }
    return current?.[key];
  }, obj);
}
