
import { useState, useEffect } from 'react';
import { agentService, AgentToolConfig } from '@/services/agentService';

export const useAgentToolConfigs = (agentId: string | null) => {
  const [toolConfigs, setToolConfigs] = useState<AgentToolConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadToolConfigs = async () => {
    if (!agentId) {
      setToolConfigs([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const configs = await agentService.getAgentToolConfigs(agentId);
      setToolConfigs(configs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tool configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const updateToolConfig = async (
    mcpId: string,
    config: Partial<Omit<AgentToolConfig, 'id' | 'agent_id' | 'mcp_id' | 'created_at' | 'updated_at'>>
  ): Promise<AgentToolConfig | null> => {
    if (!agentId) return null;

    const updatedConfig = await agentService.updateAgentToolConfig(agentId, mcpId, config);
    if (updatedConfig) {
      setToolConfigs(prev => {
        const existing = prev.find(c => c.mcp_id === mcpId);
        if (existing) {
          return prev.map(c => c.mcp_id === mcpId ? updatedConfig : c);
        } else {
          return [...prev, updatedConfig];
        }
      });
    }
    return updatedConfig;
  };

  const deleteToolConfig = async (mcpId: string): Promise<boolean> => {
    if (!agentId) return false;

    const success = await agentService.deleteAgentToolConfig(agentId, mcpId);
    if (success) {
      setToolConfigs(prev => prev.filter(c => c.mcp_id !== mcpId));
    }
    return success;
  };

  useEffect(() => {
    loadToolConfigs();
  }, [agentId]);

  return {
    toolConfigs,
    isLoading,
    error,
    loadToolConfigs,
    updateToolConfig,
    deleteToolConfig,
  };
};
