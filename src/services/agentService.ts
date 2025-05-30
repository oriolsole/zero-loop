
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import type { Json } from '@/integrations/supabase/types';

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

// Helper function to safely transform JSON to string array
function transformCustomUseCases(useCases: Json | null): string[] | undefined {
  if (!useCases) return undefined;
  if (Array.isArray(useCases)) {
    return useCases.filter((item): item is string => typeof item === 'string');
  }
  return undefined;
}

// Helper function to transform string array to JSON for storage
function serializeCustomUseCases(useCases: string[] | undefined): Json | null {
  if (!useCases || !Array.isArray(useCases)) return null;
  return useCases as Json;
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
   * Ensure a default agent exists for the current user, create one if it doesn't
   */
  async ensureDefaultAgent(): Promise<Agent | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.error('No authenticated user found');
      return null;
    }

    // Check if a default agent already exists
    const existingDefault = await this.getDefaultAgent();
    if (existingDefault) {
      return existingDefault;
    }

    // Check if any agents exist for this user
    const userAgents = await this.getUserAgents();
    
    if (userAgents.length > 0) {
      // If agents exist but none are default, make the first one default
      const firstAgent = userAgents[0];
      const updatedAgent = await this.updateAgent({
        id: firstAgent.id,
        is_default: true
      });
      if (updatedAgent) {
        console.log('Set existing agent as default:', updatedAgent.name);
        return updatedAgent;
      }
    }

    // Create a new default agent
    console.log('Creating new default agent for user');
    const defaultAgent = await this.createAgent({
      name: 'General Assistant',
      description: 'A helpful AI assistant with access to various tools and capabilities',
      system_prompt: '', // Will use generated system prompt
      model: 'gpt-4o',
      loop_enabled: false,
      is_default: true
    });

    if (defaultAgent) {
      console.log('Created default agent:', defaultAgent.name);
    }

    return defaultAgent;
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
    console.log('🔍 Fetching tool configs for agent:', agentId);
    
    const { data, error } = await supabase
      .from('agent_tool_configs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching agent tool configs:', error);
      toast.error('Failed to load tool configurations');
      return [];
    }

    console.log('📄 Raw tool configs from DB:', data);

    // Transform the data to match our interface
    const transformedConfigs = (data || []).map(config => ({
      ...config,
      custom_use_cases: transformCustomUseCases(config.custom_use_cases),
    }));

    console.log('✅ Transformed tool configs:', transformedConfigs);
    return transformedConfigs;
  },

  /**
   * Update tool configuration for an agent
   */
  async updateAgentToolConfig(
    agentId: string,
    mcpId: string,
    config: Partial<Omit<AgentToolConfig, 'id' | 'agent_id' | 'mcp_id' | 'created_at' | 'updated_at'>>
  ): Promise<AgentToolConfig | null> {
    console.log('💾 Updating agent tool config:', {
      agentId,
      mcpId,
      config
    });

    // Prepare the data for upsert
    const upsertData = {
      agent_id: agentId,
      mcp_id: mcpId,
      is_active: config.is_active ?? true,
      custom_title: config.custom_title || null,
      custom_description: config.custom_description || null,
      custom_use_cases: serializeCustomUseCases(config.custom_use_cases),
      priority_override: config.priority_override ?? null,
    };

    console.log('📤 Data being sent to database:', upsertData);

    try {
      // Use upsert with onConflict to handle the unique constraint properly
      const { data, error } = await supabase
        .from('agent_tool_configs')
        .upsert(upsertData, { 
          onConflict: 'agent_id,mcp_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating agent tool config:', error);
        
        // Provide more specific error messages
        if (error.code === '23505') {
          toast.error('Failed to update tool configuration: Duplicate entry detected');
        } else if (error.message?.includes('row-level security')) {
          toast.error('Failed to update tool configuration: Permission denied');
        } else {
          toast.error(`Failed to update tool configuration: ${error.message}`);
        }
        return null;
      }

      console.log('✅ Successfully saved tool config:', data);

      // Transform the response data to match our interface
      const transformedResult = {
        ...data,
        custom_use_cases: transformCustomUseCases(data.custom_use_cases),
      };

      console.log('🔄 Transformed result:', transformedResult);
      return transformedResult;
    } catch (error) {
      console.error('❌ Exception during tool config update:', error);
      toast.error(`Failed to update tool configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  },

  /**
   * Delete a tool configuration for an agent
   */
  async deleteAgentToolConfig(agentId: string, mcpId: string): Promise<boolean> {
    console.log('🗑️ Deleting agent tool config:', { agentId, mcpId });
    
    const { error } = await supabase
      .from('agent_tool_configs')
      .delete()
      .eq('agent_id', agentId)
      .eq('mcp_id', mcpId);

    if (error) {
      console.error('❌ Error deleting agent tool config:', error);
      toast.error('Failed to delete tool configuration');
      return false;
    }

    console.log('✅ Successfully deleted tool config');
    return true;
  },
};
