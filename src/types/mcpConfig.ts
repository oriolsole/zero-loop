
/**
 * Standardized Model Context Protocol (MCP) configuration types
 * Based on the emerging MCP standard for tool portability
 */

export interface MCPProtocolVersion {
  protocol: 'ModelContextProtocol';
  version: string;
}

export interface MCPModelConfig {
  name: string;
  provider?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface MCPSessionConfig {
  id?: string;
  user_id?: string;
  timeout?: number;
  persistent?: boolean;
}

export interface MCPParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required: boolean;
  default?: any;
  enum?: string[];
  properties?: Record<string, any>;
}

export interface MCPInputOutputSchema {
  input: {
    type: string;
    properties: Record<string, MCPParameterSchema>;
    required: string[];
  };
  output: {
    type: string;
    properties?: Record<string, any>;
  };
}

export interface MCPSecurityConfig {
  encryption?: string;
  authentication?: {
    type: 'api_key' | 'oauth' | 'basic';
    provider?: string;
    required: boolean;
  };
  permissions?: string[];
}

export interface MCPToolDefinition {
  id: string;
  name: string;
  title: string;
  description: string;
  endpoint: string;
  icon?: string;
  category?: string;
  tags?: string[];
  schema: MCPInputOutputSchema;
  security?: MCPSecurityConfig;
  metadata?: {
    version?: string;
    author?: string;
    license?: string;
    documentation?: string;
    sampleUseCases?: string[];
    suggestedPrompt?: string;
  };
}

export interface MCPContextConfig {
  tools: MCPToolDefinition[];
  sources?: Array<{
    id: string;
    type: 'database' | 'file' | 'api';
    uri?: string;
    metadata?: Record<string, any>;
  }>;
  history?: {
    include_last_n_messages?: number;
    persistent?: boolean;
  };
}

export interface MCPConfiguration extends MCPProtocolVersion {
  model: MCPModelConfig;
  session: MCPSessionConfig;
  context: MCPContextConfig;
  security?: MCPSecurityConfig;
  metadata?: {
    name: string;
    description: string;
    created: string;
    updated: string;
    author?: string;
  };
}

// Individual tool configuration file format
export interface MCPToolConfig extends MCPProtocolVersion {
  tool: MCPToolDefinition;
  compatibility?: {
    frameworks: string[];
    versions: string[];
  };
}
