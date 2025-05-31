
export interface ToolExecution {
  id: string;
  tool: string;
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  parameters: Record<string, any>;
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
  status: 'pending' | 'executing' | 'completed' | 'failed';
  currentExecutionIndex: number;
  totalEstimatedTime: number;
  startTime?: Date;
  endTime?: Date;
}

export interface GitHubContext {
  isGithub: boolean;
  owner?: string;
  repo?: string;
  action?: string;
}
