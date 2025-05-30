
import { useState, useEffect } from 'react';
import { agentService, Agent, AgentToolConfig, CreateAgentInput, UpdateAgentInput } from '@/services/agentService';

export const useAgentManagement = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [defaultAgent, setDefaultAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userAgents = await agentService.getUserAgents();
      setAgents(userAgents);
      
      const defaultAgentData = await agentService.getDefaultAgent();
      setDefaultAgent(defaultAgentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };

  const ensureDefaultAgent = async (): Promise<Agent | null> => {
    try {
      const agent = await agentService.ensureDefaultAgent();
      if (agent) {
        setDefaultAgent(agent);
        // Reload agents to get updated list
        const userAgents = await agentService.getUserAgents();
        setAgents(userAgents);
      }
      return agent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ensure default agent');
      return null;
    }
  };

  const createAgent = async (input: CreateAgentInput): Promise<Agent | null> => {
    const newAgent = await agentService.createAgent(input);
    if (newAgent) {
      setAgents(prev => [newAgent, ...prev]);
      if (newAgent.is_default) {
        setDefaultAgent(newAgent);
      }
    }
    return newAgent;
  };

  const updateAgent = async (input: UpdateAgentInput): Promise<Agent | null> => {
    const updatedAgent = await agentService.updateAgent(input);
    if (updatedAgent) {
      setAgents(prev => prev.map(agent => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      ));
      if (updatedAgent.is_default) {
        setDefaultAgent(updatedAgent);
      }
    }
    return updatedAgent;
  };

  const deleteAgent = async (id: string): Promise<boolean> => {
    const success = await agentService.deleteAgent(id);
    if (success) {
      setAgents(prev => prev.filter(agent => agent.id !== id));
      if (defaultAgent?.id === id) {
        setDefaultAgent(null);
      }
    }
    return success;
  };

  useEffect(() => {
    loadAgents();
  }, []);

  return {
    agents,
    defaultAgent,
    isLoading,
    error,
    loadAgents,
    ensureDefaultAgent,
    createAgent,
    updateAgent,
    deleteAgent,
  };
};
