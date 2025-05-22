
export interface MCPParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required: boolean;
  default?: any;
  enum?: string[];
}

export interface MCP {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  icon: string;
  parameters: MCPParameter[];
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  // New fields for categorization and additional metadata
  isDefault?: boolean;
  default_key?: string; // New field to store the readable identifier
  category?: string;
  tags?: string[];
  suggestedPrompt?: string;
  sampleUseCases?: string[];
  requiresAuth?: boolean;
  authType?: 'api_key' | 'oauth' | 'basic';
  authKeyName?: string;
}

export interface MCPExecution {
  id: string;
  mcp_id: string;
  parameters: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  execution_time?: number;
  created_at?: string;
  user_id?: string;
}

export interface ExecuteMCPParams {
  mcpId: string;
  parameters: Record<string, any>;
}
