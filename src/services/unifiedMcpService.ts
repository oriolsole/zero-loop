
import { MCPConfiguration, MCPToolDefinition } from '@/types/mcpConfig';
import { MCP } from '@/types/mcp';
import { mcpConfigService } from './mcpConfigService';
import { mcpService } from './mcpService';

/**
 * Service for managing unified MCP configurations that combine all available tools
 */
export class UnifiedMcpService {
  private static instance: UnifiedMcpService;
  private unifiedConfigCache: MCPConfiguration | null = null;

  public static getInstance(): UnifiedMcpService {
    if (!UnifiedMcpService.instance) {
      UnifiedMcpService.instance = new UnifiedMcpService();
    }
    return UnifiedMcpService.instance;
  }

  /**
   * Generate a unified configuration that includes all available tools
   */
  async generateUnifiedConfiguration(): Promise<MCPConfiguration> {
    try {
      // Get database MCPs
      const databaseMCPs = await mcpService.fetchMCPs();
      
      // Get static tool configurations
      const staticToolConfigs = await mcpConfigService.getAllToolConfigs();
      
      // Convert database MCPs to standardized format
      const databaseToolDefinitions = databaseMCPs.map(mcp => 
        mcpConfigService.convertFromLegacyMCP(mcp)
      );
      
      // Extract tool definitions from static configs
      const staticToolDefinitions = staticToolConfigs.map(config => config.tool);
      
      // Combine all tools, removing duplicates by ID
      const allTools = this.deduplicateTools([
        ...staticToolDefinitions,
        ...databaseToolDefinitions
      ]);
      
      // Generate unified configuration
      const unifiedConfig: MCPConfiguration = {
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
          tools: allTools,
          sources: [
            {
              id: 'supabase-mcps',
              type: 'database',
              uri: 'supabase://mcps',
              metadata: {
                description: 'Database-stored MCP definitions',
                count: databaseMCPs.length
              }
            },
            {
              id: 'static-mcps',
              type: 'file',
              uri: 'file://config/mcp/',
              metadata: {
                description: 'Static MCP configuration files',
                count: staticToolConfigs.length
              }
            }
          ],
          history: {
            include_last_n_messages: 10,
            persistent: true
          }
        },
        security: {
          encryption: 'AES256',
          permissions: this.extractPermissions(allTools)
        },
        metadata: {
          name: 'ZeroLoop Unified AI Agent',
          description: 'Comprehensive multi-tool AI agent with all available MCP tools',
          created: new Date().toISOString().split('T')[0],
          updated: new Date().toISOString().split('T')[0],
          author: 'ZeroLoop',
          version: '1.0.0',
          toolCount: allTools.length,
          sources: ['database', 'static-files']
        }
      };
      
      this.unifiedConfigCache = unifiedConfig;
      return unifiedConfig;
      
    } catch (error) {
      console.error('Error generating unified configuration:', error);
      throw new Error('Failed to generate unified MCP configuration');
    }
  }

  /**
   * Get cached unified configuration or generate new one
   */
  async getUnifiedConfiguration(forceRefresh = false): Promise<MCPConfiguration> {
    if (!this.unifiedConfigCache || forceRefresh) {
      return await this.generateUnifiedConfiguration();
    }
    return this.unifiedConfigCache;
  }

  /**
   * Export unified configuration as JSON string
   */
  async exportUnifiedConfiguration(): Promise<string> {
    const config = await this.getUnifiedConfiguration(true);
    return JSON.stringify(config, null, 2);
  }

  /**
   * Load the static unified configuration file
   */
  async loadStaticUnifiedConfig(): Promise<MCPConfiguration> {
    try {
      const response = await fetch('/src/config/mcp/unified-agent.mcp.json');
      if (!response.ok) {
        throw new Error('Failed to load unified configuration');
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading static unified config:', error);
      throw error;
    }
  }

  /**
   * Compare current tools with static configuration to detect changes
   */
  async detectConfigurationChanges(): Promise<{
    hasChanges: boolean;
    newTools: string[];
    removedTools: string[];
    modifiedTools: string[];
  }> {
    try {
      const currentConfig = await this.generateUnifiedConfiguration();
      const staticConfig = await this.loadStaticUnifiedConfig();
      
      const currentToolIds = new Set(currentConfig.context.tools.map(t => t.id));
      const staticToolIds = new Set(staticConfig.context.tools.map(t => t.id));
      
      const newTools = Array.from(currentToolIds).filter(id => !staticToolIds.has(id));
      const removedTools = Array.from(staticToolIds).filter(id => !currentToolIds.has(id));
      
      // Check for modifications in existing tools
      const modifiedTools: string[] = [];
      currentConfig.context.tools.forEach(currentTool => {
        const staticTool = staticConfig.context.tools.find(t => t.id === currentTool.id);
        if (staticTool && this.toolsAreDifferent(currentTool, staticTool)) {
          modifiedTools.push(currentTool.id);
        }
      });
      
      return {
        hasChanges: newTools.length > 0 || removedTools.length > 0 || modifiedTools.length > 0,
        newTools,
        removedTools,
        modifiedTools
      };
    } catch (error) {
      console.error('Error detecting configuration changes:', error);
      return { hasChanges: false, newTools: [], removedTools: [], modifiedTools: [] };
    }
  }

  /**
   * Get statistics about the unified configuration
   */
  async getConfigurationStats(): Promise<{
    totalTools: number;
    toolsByCategory: Record<string, number>;
    toolsByProvider: Record<string, number>;
    authRequiredTools: number;
    publicTools: number;
  }> {
    const config = await this.getUnifiedConfiguration();
    const tools = config.context.tools;
    
    const toolsByCategory: Record<string, number> = {};
    const toolsByProvider: Record<string, number> = {};
    let authRequiredTools = 0;
    let publicTools = 0;
    
    tools.forEach(tool => {
      // Count by category
      const category = tool.category || 'uncategorized';
      toolsByCategory[category] = (toolsByCategory[category] || 0) + 1;
      
      // Count by provider
      const provider = tool.security?.authentication?.provider || 'none';
      toolsByProvider[provider] = (toolsByProvider[provider] || 0) + 1;
      
      // Count auth requirements
      if (tool.security?.authentication?.required) {
        authRequiredTools++;
      } else {
        publicTools++;
      }
    });
    
    return {
      totalTools: tools.length,
      toolsByCategory,
      toolsByProvider,
      authRequiredTools,
      publicTools
    };
  }

  /**
   * Clear the configuration cache
   */
  clearCache(): void {
    this.unifiedConfigCache = null;
  }

  /**
   * Remove duplicate tools, preferring static configurations over database ones
   */
  private deduplicateTools(tools: MCPToolDefinition[]): MCPToolDefinition[] {
    const toolMap = new Map<string, MCPToolDefinition>();
    
    // Add all tools, letting later ones override earlier ones
    tools.forEach(tool => {
      toolMap.set(tool.id, tool);
    });
    
    return Array.from(toolMap.values());
  }

  /**
   * Extract all permissions from tools
   */
  private extractPermissions(tools: MCPToolDefinition[]): string[] {
    const permissions = new Set<string>();
    
    tools.forEach(tool => {
      if (tool.security?.permissions) {
        tool.security.permissions.forEach(permission => permissions.add(permission));
      }
    });
    
    return Array.from(permissions).sort();
  }

  /**
   * Compare two tools to detect differences
   */
  private toolsAreDifferent(tool1: MCPToolDefinition, tool2: MCPToolDefinition): boolean {
    // Simple comparison - could be enhanced for deeper checks
    const fields = ['name', 'title', 'description', 'endpoint'] as const;
    return fields.some(field => tool1[field] !== tool2[field]);
  }
}

export const unifiedMcpService = UnifiedMcpService.getInstance();
