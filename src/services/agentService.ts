
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  model: string;
  loop_enabled: boolean;
  user_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentToolConfig {
  id: string;
  agent_id: string;
  mcp_id: string;
  is_active: boolean;
  custom_title?: string;
  custom_description?: string;
  custom_use_cases?: string[];
  priority_override?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  system_prompt?: string;
  model?: string;
  loop_enabled?: boolean;
  is_default?: boolean;
}

export interface UpdateAgentInput extends Partial<CreateAgentInput> {
  id: string;
}

export const agentService = {
  /**
   * Get all agents for the current user
   */
  async getUserAgents(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user agents:', error);
      toast.error('Failed to load agents');
      return [];
    }

    return data || [];
  },

  /**
   * Get a specific agent by ID
   */
  async getAgent(id: string): Promise<Agent | null> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching agent:', error);
      toast.error('Failed to load agent');
      return null;
    }

    return data;
  },

  /**
   * Get the default agent for the current user
   */
  async getDefaultAgent(): Promise<Agent | null> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching default agent:', error);
      return null;
    }

    return data;
  },

  /**
   * Create a new agent
   */
  async createAgent(input: CreateAgentInput): Promise<Agent | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error('You must be logged in to create an agent');
      return null;
    }

    // If this is set as default, unset other defaults first
    if (input.is_default) {
      await supabase
        .from('agents')
        .update({ is_default: false })
        .eq('user_id', userData.user.id);
    }

    const { data, error } = await supabase
      .from('agents')
      .insert({
        name: input.name,
        description: input.description,
        system_prompt: input.system_prompt,
        model: input.model || 'gpt-4o',
        loop_enabled: input.loop_enabled || false,
        is_default: input.is_default || false,
        user_id: userData.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
      return null;
    }

    toast.success('Agent created successfully');
    return data;
  },

  /**
   * Update an existing agent
   */
  async updateAgent(input: UpdateAgentInput): Promise<Agent | null> {
    // If this is set as default, unset other defaults first
    if (input.is_default) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase
          .from('agents')
          .update({ is_default: false })
          .eq('user_id', userData.user.id)
          .neq('id', input.id);
      }
    }

    const { data, error } = await supabase
      .from('agents')
      .update({
        name: input.name,
        description: input.description,
        system_prompt: input.system_prompt,
        model: input.model,
        loop_enabled: input.loop_enabled,
        is_default: input.is_default,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent:', error);
      toast.error('Failed to update agent');
      return null;
    }

    toast.success('Agent updated successfully');
    return data;
  },

  /**
   * Delete an agent
   */
  async deleteAgent(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
      return false;
    }

    toast.success('Agent deleted successfully');
    return true;
  },

  /**
   * Get tool configurations for an agent
   */
  async getAgentToolConfigs(agentId: string): Promise<AgentToolConfig[]> {
    const { data, error } = await supabase
      .from('agent_tool_configs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agent tool configs:', error);
      toast.error('Failed to load tool configurations');
      return [];
    }

    return data || [];
  },

  /**
   * Update tool configuration for an agent
   */
  async updateAgentToolConfig(
    agentId: string,
    mcpId: string,
    config: Partial<Omit<AgentToolConfig, 'id' | 'agent_id' | 'mcp_id' | 'created_at' | 'updated_at'>>
  ): Promise<AgentToolConfig | null> {
    const { data, error } = await supabase
      .from('agent_tool_configs')
      .upsert({
        agent_id: agentId,
        mcp_id: mcpId,
        ...config,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating agent tool config:', error);
      toast.error('Failed to update tool configuration');
      return null;
    }

    return data;
  },

  /**
   * Delete a tool configuration for an agent
   */
  async deleteAgentToolConfig(agentId: string, mcpId: string): Promise<boolean> {
    const { error } = await supabase
      .from('agent_tool_configs')
      .delete()
      .eq('agent_id', agentId)
      .eq('mcp_id', mcpId);

    if (error) {
      console.error('Error deleting agent tool config:', error);
      toast.error('Failed to delete tool configuration');
      return false;
    }

    return true;
  },
};
