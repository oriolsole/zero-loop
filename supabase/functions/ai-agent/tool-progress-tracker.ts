
/**
 * Tool progress tracking utilities
 */

export interface ToolProgress {
  id: string;
  name: string;
  displayName: string;
  status: 'starting' | 'executing' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  parameters: any;
  progress: number;
  result?: any;
  error?: string;
}

/**
 * Create a new tool progress item
 */
export function createToolProgress(
  functionName: string,
  parameters: any
): ToolProgress {
  return {
    id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: functionName,
    displayName: functionName.replace('execute_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    status: 'starting',
    startTime: new Date().toISOString(),
    parameters,
    progress: 0
  };
}

/**
 * Update tool progress status
 */
export function updateToolProgress(
  toolProgress: ToolProgress[],
  functionName: string,
  updates: Partial<ToolProgress>
): ToolProgress[] {
  const progressIndex = toolProgress.findIndex(t => t.name === functionName);
  if (progressIndex !== -1) {
    toolProgress[progressIndex] = {
      ...toolProgress[progressIndex],
      ...updates
    };
  }
  return toolProgress;
}

/**
 * Mark tool as completed
 */
export function completeToolProgress(
  toolProgress: ToolProgress[],
  functionName: string,
  result: any
): ToolProgress[] {
  return updateToolProgress(toolProgress, functionName, {
    status: 'completed',
    endTime: new Date().toISOString(),
    progress: 100,
    result
  });
}

/**
 * Mark tool as failed
 */
export function failToolProgress(
  toolProgress: ToolProgress[],
  functionName: string,
  error: string
): ToolProgress[] {
  return updateToolProgress(toolProgress, functionName, {
    status: 'failed',
    endTime: new Date().toISOString(),
    error
  });
}
