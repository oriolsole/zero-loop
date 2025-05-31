
export interface ToolDependency {
  toolId: string;
  parameter: string;
  sourceParameter?: string;
}

export interface ToolExecution {
  id: string;
  tool: string;
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  parameters: Record<string, any>;
  dependencies: ToolDependency[];
  canRunInParallel: boolean;
  priority: number;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  estimatedDuration: number;
}

export interface MultiToolPlan {
  id: string;
  title: string;
  description: string;
  executions: ToolExecution[];
  executionGroups: ToolExecution[][];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  currentExecutionIndex: number;
  currentGroupIndex: number;
  totalEstimatedTime: number;
  startTime?: Date;
  endTime?: Date;
  optimizationApplied: boolean;
}

export interface GitHubContext {
  isGithub: boolean;
  owner?: string;
  repo?: string;
  action?: string;
}

export interface ToolPlanningContext {
  query: string;
  previousResults: Record<string, any>;
  suggestedTools: string[];
  dependencies: Record<string, string[]>;
}
