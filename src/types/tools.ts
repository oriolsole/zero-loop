
// Simplified atomic tool types
export type ToolStatus = 'running' | 'completed' | 'failed';

export interface AtomicTool {
  id: string;
  name: string;
  displayName: string;
  status: ToolStatus;
  startTime: string;
  endTime?: string;
  result?: any;
  error?: string;
}

// Legacy type for backward compatibility
export interface ToolProgressItem {
  id: string;
  name: string;
  displayName: string;
  status: 'starting' | 'executing' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  parameters?: any;
  progress?: number;
  result?: any;
  error?: string;
}

export interface ConversationContext {
  toolResults: Map<string, any>;
}
