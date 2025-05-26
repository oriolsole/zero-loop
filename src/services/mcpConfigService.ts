
import { MCPConfiguration, MCPToolConfig, MCPToolDefinition } from '@/types/mcpConfig';
import { MCP } from '@/types/mcp';

/**
 * Service for loading and managing MCP configuration files
 */
export class MCPConfigService {
  private static instance: MCPConfigService;
  private configCache: Map<string, MCPConfiguration | MCPToolConfig> = new Map();

  public static getInstance(): MCPConfigService {
    if (!MCPConfigService.instance) {
      MCPConfigService.instance = new MCPConfigService();
    }
    return MCPConfigService.instance;
  }

  /**
   * Load MCP configuration from JSON file
   */
  async loadConfig(configPath: string): Promise<MCPConfiguration | MCPToolConfig> {
    if (this.configCache.has(configPath)) {
      return this.configCache.get(configPath)!;
    }

    try {
      const response = await fetch(configPath);
      if (!response.ok) {
        throw new Error(`Failed to load MCP config from ${configPath}: ${response.statusText}`);
      }

      const config = await response.json();
      this.validateConfig(config);
      
      this.configCache.set(configPath, config);
      return config;
    } catch (error) {
      console.error('Error loading MCP config:', error);
      throw error;
    }
  }

  /**
   * Load the main agent configuration
   */
  async loadAgentConfig(): Promise<MCPConfiguration> {
    const config = await this.loadConfig('/src/config/mcp/agent.mcp.json');
    
    if (!this.isAgentConfig(config)) {
      throw new Error('Invalid agent configuration format');
    }

    return config;
  }

  /**
   * Load individual tool configuration
   */
  async loadToolConfig(toolId: string): Promise<MCPToolConfig> {
    const configPath = `/src/config/mcp/${toolId}.mcp.json`;
    const config = await this.loadConfig(configPath);
    
    if (!this.isToolConfig(config)) {
      throw new Error(`Invalid tool configuration format for ${toolId}`);
    }

    return config;
  }

  /**
   * Convert MCP tool definition to legacy MCP format for backward compatibility
   */
  convertToLegacyMCP(toolDef: MCPToolDefinition): Partial<MCP> {
    return {
      id: toolDef.id,
      title: toolDef.title,
      description: toolDef.description,
      endpoint: toolDef.endpoint,
      icon: toolDef.icon || 'terminal',
      category: toolDef.category,
      tags: toolDef.tags || [],
      parameters: this.convertSchemaToParameters(toolDef.schema),
      requiresAuth: toolDef.security?.authentication?.required || false,
      authType: toolDef.security?.authentication?.type,
      requirestoken: toolDef.security?.authentication?.provider,
      sampleUseCases: toolDef.metadata?.sampleUseCases || [],
      suggestedPrompt: toolDef.metadata?.suggestedPrompt,
      default_key: toolDef.id,
      isDefault: true
    };
  }

  /**
   * Convert legacy MCP to standardized format
   */
  convertFromLegacyMCP(mcp: MCP): MCPToolDefinition {
    return {
      id: mcp.id,
      name: `execute_${mcp.default_key || mcp.id}`,
      title: mcp.title,
      description: mcp.description,
      endpoint: mcp.endpoint,
      icon: mcp.icon,
      category: mcp.category,
      tags: mcp.tags || [],
      schema: this.convertParametersToSchema(mcp.parameters),
      security: mcp.requiresAuth ? {
        authentication: {
          type: mcp.authType || 'api_key',
          provider: mcp.requirestoken,
          required: true
        }
      } : undefined,
      metadata: {
        version: '1.0.0',
        sampleUseCases: mcp.sampleUseCases || [],
        suggestedPrompt: mcp.suggestedPrompt
      }
    };
  }

  /**
   * Get all available tool configurations
   */
  async getAllToolConfigs(): Promise<MCPToolConfig[]> {
    const toolIds = ['web-search', 'github-tools', 'knowledge-search-v2', 'jira-tools', 'web-scraper'];
    
    const configs = await Promise.all(
      toolIds.map(async (toolId) => {
        try {
          return await this.loadToolConfig(toolId);
        } catch (error) {
          console.warn(`Failed to load tool config for ${toolId}:`, error);
          return null;
        }
      })
    );

    return configs.filter((config): config is MCPToolConfig => config !== null);
  }

  /**
   * Export current configuration as standardized MCP file
   */
  async exportConfiguration(mcps: MCP[]): Promise<MCPConfiguration> {
    const toolDefinitions = mcps.map(mcp => this.convertFromLegacyMCP(mcp));

    return {
      protocol: 'ModelContextProtocol',
      version: '1.0.0',
      model: {
        name: 'gpt-4o-mini',
        provider: 'openai',
        max_tokens: 2000,
        temperature: 0.7
      },
      session: {
        timeout: 3600,
        persistent: true
      },
      context: {
        tools: toolDefinitions,
        history: {
          include_last_n_messages: 10,
          persistent: true
        }
      },
      security: {
        encryption: 'AES256',
        permissions: toolDefinitions.flatMap(tool => 
          tool.security?.permissions || []
        )
      },
      metadata: {
        name: 'ZeroLoop AI Agent',
        description: 'Multi-tool AI agent configuration',
        created: new Date().toISOString().split('T')[0],
        updated: new Date().toISOString().split('T')[0],
        author: 'ZeroLoop'
      }
    };
  }

  private validateConfig(config: any): void {
    if (!config.protocol || config.protocol !== 'ModelContextProtocol') {
      throw new Error('Invalid MCP configuration: missing or invalid protocol field');
    }

    if (!config.version) {
      throw new Error('Invalid MCP configuration: missing version field');
    }
  }

  private isAgentConfig(config: MCPConfiguration | MCPToolConfig): config is MCPConfiguration {
    return 'model' in config && 'context' in config;
  }

  private isToolConfig(config: MCPConfiguration | MCPToolConfig): config is MCPToolConfig {
    return 'tool' in config;
  }

  private convertSchemaToParameters(schema: any): any[] {
    const properties = schema.input?.properties || {};
    const required = schema.input?.required || [];

    return Object.entries(properties).map(([name, prop]: [string, any]) => ({
      name,
      type: prop.type,
      description: prop.description,
      required: required.includes(name),
      default: prop.default,
      enum: prop.enum
    }));
  }

  private convertParametersToSchema(parameters: any[]): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    parameters.forEach(param => {
      properties[param.name] = {
        type: param.type,
        description: param.description,
        default: param.default,
        enum: param.enum
      };

      if (param.required) {
        required.push(param.name);
      }
    });

    return {
      input: {
        type: 'object',
        properties,
        required
      },
      output: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            description: 'Tool execution result'
          }
        }
      }
    };
  }
}

export const mcpConfigService = MCPConfigService.getInstance();
