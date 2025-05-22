
import { supabase } from '@/integrations/supabase/client';
import { MCP, MCPExecution, ExecuteMCPParams, MCPParameter } from '@/types/mcp';
import { toast } from '@/components/ui/sonner';
import { Json } from '@/integrations/supabase/types';
import { defaultMCPs } from '@/constants/defaultMCPs';
import { isValidUUID } from '@/utils/supabase/helpers';

// Helper function to convert a JSON parameter from Supabase to our frontend MCPParameter type
const convertJsonToMCPParameter = (param: Json): MCPParameter => {
  if (typeof param === 'object' && param !== null && !Array.isArray(param)) {
    // Use type assertion to avoid deep type instantiation
    const typedParam = param as {
      name?: string;
      type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
      description?: string;
      required?: boolean;
      default?: any;
      enum?: string[];
    };
    
    return {
      name: typedParam.name || '',
      type: typedParam.type || 'string',
      description: typedParam.description || '',
      required: Boolean(typedParam.required),
      default: typedParam.default,
      enum: typedParam.enum
    };
  }
  // Return a default parameter if the data is malformed
  return {
    name: 'unknown',
    type: 'string',
    required: false
  };
};

// Helper function to convert MCPParameter to Json for storage
const convertMCPParameterToJson = (param: MCPParameter): Json => {
  // Return a plain object without type recursion
  return {
    name: param.name,
    type: param.type,
    description: param.description,
    required: param.required,
    default: param.default,
    enum: param.enum
  } as Json;
};

// Helper function to safely convert status string to MCPExecution status type
const convertToMCPStatus = (status: string): "pending" | "running" | "completed" | "failed" => {
  switch (status) {
    case "pending": return "pending";
    case "running": return "running";
    case "completed": return "completed";
    case "failed": return "failed";
    default: return "pending"; // Default fallback
  }
};

export const mcpService = {
  /**
   * Seed the default MCPs into the database if they don't exist already
   * @param userId Optional user ID to associate with the seeded MCPs
   */
  async seedDefaultMCPs(userId?: string): Promise<void> {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = userId || session?.user?.id;

      // Log the authentication status for debugging
      console.log('Seeding default MCPs. Authentication status:', {
        hasSession: !!session,
        userId: currentUserId
      });

      // Without authentication, we can only check if default MCPs exist, but not insert them
      if (!currentUserId) {
        console.warn('Cannot seed default MCPs: User not authenticated');
        return; // Silently return instead of showing an error to avoid confusing users
      }

      // First, get all existing MCPs that have the isDefault flag set
      const { data: existingMCPs, error: fetchError } = await supabase
        .from('mcps')
        .select('id, default_key')
        .eq('isDefault', true)
        .eq('user_id', currentUserId);

      if (fetchError) {
        console.error('Error fetching existing MCPs:', fetchError);
        throw fetchError;
      }

      // Get existing default keys to avoid duplicates
      const existingKeys = (existingMCPs || []).map(mcp => mcp.default_key);
      console.log('Existing default keys:', existingKeys);
      
      // Determine which default MCPs need to be created
      const mcpsToCreate = defaultMCPs.filter(mcp => !existingKeys.includes(mcp.default_key));

      console.log(`Found ${mcpsToCreate.length} new MCPs to create`);

      if (mcpsToCreate.length === 0) {
        console.log('All default MCPs are already seeded');
        return;
      }

      // Prepare MCPs for insertion with the user_id field and validate UUIDs
      const mcpsForInsert = mcpsToCreate.map(mcp => {
        // Validate UUID format - make sure we're using proper UUIDs
        if (!isValidUUID(mcp.id)) {
          console.warn(`Invalid UUID format for ${mcp.default_key}, generating new UUID`);
          mcp.id = crypto.randomUUID(); // Generate a new UUID if the format is invalid
        }
        
        return {
          id: mcp.id,
          title: mcp.title,
          description: mcp.description,
          endpoint: mcp.endpoint,
          icon: mcp.icon,
          parameters: mcp.parameters.map(convertMCPParameterToJson),
          isDefault: true,
          default_key: mcp.default_key,
          category: mcp.category,
          tags: mcp.tags,
          suggestedPrompt: mcp.suggestedPrompt,
          sampleUseCases: mcp.sampleUseCases,
          requiresAuth: mcp.requiresAuth,
          authType: mcp.authType,
          authKeyName: mcp.authKeyName,
          user_id: currentUserId
        };
      });

      // Insert the missing default MCPs one by one for better error handling
      for (const mcp of mcpsForInsert) {
        try {
          console.log(`Inserting MCP: ${mcp.title} with ID: ${mcp.id} and default_key: ${mcp.default_key}`);
          
          const { error } = await supabase
            .from('mcps')
            .insert(mcp);

          if (error) {
            console.error(`Error inserting MCP ${mcp.title}:`, error);
            // Continue with other MCPs even if one fails
          } else {
            console.log(`Successfully inserted MCP: ${mcp.title}`);
          }
        } catch (insertError) {
          console.error(`Failed to insert MCP ${mcp.title}:`, insertError);
          // Continue with other MCPs
        }
      }

      // Count successful insertions
      const successfulInsertions = mcpsForInsert.length;
      console.log(`Attempted to seed ${mcpsForInsert.length} default MCPs`);
      
      if (successfulInsertions > 0) {
        toast.success(`Added ${successfulInsertions} pre-configured tools`);
      }
    } catch (error: any) {
      console.error('Error seeding default MCPs:', error);
      // Only show error toast if it's not an auth-related issue
      if (error.message !== 'User not authenticated') {
        toast.error(`Failed to seed default MCPs: ${error.message}`);
      }
    }
  },

  /**
   * Fetch all MCPs available to the user
   */
  async fetchMCPs(): Promise<MCP[]> {
    try {
      const { data, error } = await supabase
        .from('mcps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convert the parameters from JSON to proper typed array
      return (data || []).map(item => ({
        ...item,
        parameters: Array.isArray(item.parameters) 
          ? item.parameters.map(convertJsonToMCPParameter)
          : []
      })) as MCP[];
    } catch (error) {
      console.error('Error fetching MCPs:', error);
      toast.error('Failed to load MCPs');
      return [];
    }
  },

  /**
   * Fetch a specific MCP by ID
   */
  async fetchMCPById(id: string): Promise<MCP | null> {
    try {
      const { data, error } = await supabase
        .from('mcps')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Convert parameters from JSON to typed parameters
      return data ? {
        ...data,
        parameters: Array.isArray(data.parameters) 
          ? data.parameters.map(convertJsonToMCPParameter)
          : []
      } as MCP : null;
    } catch (error) {
      console.error(`Error fetching MCP ${id}:`, error);
      toast.error('Failed to load MCP details');
      return null;
    }
  },

  /**
   * Create a new MCP
   */
  async createMCP(mcp: Omit<MCP, 'id' | 'created_at' | 'updated_at'>): Promise<MCP | null> {
    try {
      // Convert parameters to JSON for storage
      const mcpData = {
        title: mcp.title,
        description: mcp.description,
        endpoint: mcp.endpoint,
        icon: mcp.icon,
        parameters: mcp.parameters.map(convertMCPParameterToJson)
      };
      
      const { data, error } = await supabase
        .from('mcps')
        .insert(mcpData)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('MCP created successfully');
      
      // Convert parameters from JSON to typed parameters when returning
      return data ? {
        ...data,
        parameters: Array.isArray(data.parameters) 
          ? data.parameters.map(convertJsonToMCPParameter)
          : []
      } as MCP : null;
    } catch (error) {
      console.error('Error creating MCP:', error);
      toast.error('Failed to create MCP');
      return null;
    }
  },

  /**
   * Update an existing MCP
   */
  async updateMCP(id: string, updates: Partial<MCP>): Promise<MCP | null> {
    try {
      // Prepare update data ensuring proper JSON conversion
      const updateData: any = {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.endpoint !== undefined && { endpoint: updates.endpoint }),
        ...(updates.icon !== undefined && { icon: updates.icon }),
        ...(updates.parameters !== undefined && { 
          parameters: updates.parameters.map(convertMCPParameterToJson)
        }),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('mcps')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('MCP updated successfully');
      
      // Convert parameters from JSON to typed parameters when returning
      return data ? {
        ...data,
        parameters: Array.isArray(data.parameters) 
          ? data.parameters.map(convertJsonToMCPParameter)
          : []
      } as MCP : null;
    } catch (error) {
      console.error(`Error updating MCP ${id}:`, error);
      toast.error('Failed to update MCP');
      return null;
    }
  },

  /**
   * Delete an MCP
   */
  async deleteMCP(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mcps')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('MCP deleted successfully');
      return true;
    } catch (error) {
      console.error(`Error deleting MCP ${id}:`, error);
      toast.error('Failed to delete MCP');
      return false;
    }
  },

  /**
   * Execute an MCP with the given parameters
   */
  async executeMCP({ mcpId, parameters }: ExecuteMCPParams): Promise<MCPExecution | null> {
    try {
      // First create an execution record
      const { data: executionData, error: executionError } = await supabase
        .from('mcp_executions')
        .insert({
          mcp_id: mcpId,
          parameters: parameters as unknown as Json,
          status: 'running'
        })
        .select()
        .single();

      if (executionError) throw executionError;
      
      // Handle the conversion properly for type safety
      const execution: MCPExecution = {
        id: executionData.id,
        mcp_id: executionData.mcp_id || '',
        parameters: executionData.parameters as unknown as Record<string, any>,
        result: executionData.result as unknown as Record<string, any> || {},
        status: convertToMCPStatus(executionData.status),
        error: executionData.error || '',
        execution_time: executionData.execution_time || 0,
        created_at: executionData.created_at || '',
        user_id: executionData.user_id || ''
      };
      
      // Get the MCP details
      const mcp = await this.fetchMCPById(mcpId);
      if (!mcp) throw new Error(`MCP with ID ${mcpId} not found`);
      
      const startTime = Date.now();
      
      try {
        // Check if the MCP requires authentication and handle it
        let headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        // Add auth header if required
        if (mcp.requiresAuth && mcp.authKeyName) {
          const authKey = await this.getMCPAuthKey(mcp.authKeyName);
          if (!authKey) {
            throw new Error(`Authentication required for this MCP. Missing key: ${mcp.authKeyName}`);
          }
          
          if (mcp.authType === 'api_key') {
            headers['Authorization'] = `Bearer ${authKey}`;
          }
        }
        
        // Execute the MCP by calling its endpoint
        const response = await fetch(mcp.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: mcp.id,
            parameters
          })
        });
        
        if (!response.ok) {
          throw new Error(`MCP execution failed with status ${response.status}`);
        }
        
        const result = await response.json();
        const executionTime = Date.now() - startTime;
        
        // Update execution record with results
        const { data: updatedExecution, error: updateError } = await supabase
          .from('mcp_executions')
          .update({
            status: 'completed',
            result: result as Json,
            execution_time: executionTime
          })
          .eq('id', execution.id)
          .select()
          .single();
          
        if (updateError) throw updateError;
        
        toast.success('MCP executed successfully');
        
        // Convert for type safety
        return updatedExecution ? {
          id: updatedExecution.id,
          mcp_id: updatedExecution.mcp_id || '',
          parameters: updatedExecution.parameters as unknown as Record<string, any>,
          result: updatedExecution.result as unknown as Record<string, any> || {},
          status: convertToMCPStatus(updatedExecution.status),
          error: updatedExecution.error || '',
          execution_time: updatedExecution.execution_time || 0,
          created_at: updatedExecution.created_at || '',
          user_id: updatedExecution.user_id || ''
        } as MCPExecution : null;
      } catch (error) {
        // Update execution record with error
        const { data: failedExecution } = await supabase
          .from('mcp_executions')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            execution_time: Date.now() - startTime
          })
          .eq('id', execution.id)
          .select()
          .single();
          
        console.error(`MCP execution failed:`, error);
        toast.error('MCP execution failed');
        
        // Convert for type safety
        return failedExecution ? {
          id: failedExecution.id,
          mcp_id: failedExecution.mcp_id || '',
          parameters: failedExecution.parameters as unknown as Record<string, any>,
          result: failedExecution.result as unknown as Record<string, any> || {},
          status: convertToMCPStatus(failedExecution.status),
          error: failedExecution.error || '',
          execution_time: failedExecution.execution_time || 0,
          created_at: failedExecution.created_at || '',
          user_id: failedExecution.user_id || ''
        } as MCPExecution : null;
      }
    } catch (error) {
      console.error('Error executing MCP:', error);
      toast.error('Failed to execute MCP');
      return null;
    }
  },

  /**
   * Fetch execution history for a specific MCP
   */
  async fetchMCPExecutions(mcpId: string): Promise<MCPExecution[]> {
    try {
      const { data, error } = await supabase
        .from('mcp_executions')
        .select('*')
        .eq('mcp_id', mcpId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convert parameters and results for type safety
      return (data || []).map(item => ({
        id: item.id,
        mcp_id: item.mcp_id || '',
        parameters: item.parameters as unknown as Record<string, any>,
        result: item.result as unknown as Record<string, any> || {},
        status: convertToMCPStatus(item.status),
        error: item.error || '',
        execution_time: item.execution_time || 0,
        created_at: item.created_at || '',
        user_id: item.user_id || ''
      })) as MCPExecution[];
    } catch (error) {
      console.error(`Error fetching executions for MCP ${mcpId}:`, error);
      toast.error('Failed to load execution history');
      return [];
    }
  },

  /**
   * Convert MCP execution result to a knowledge node
   */
  async saveResultAsKnowledgeNode(execution: MCPExecution, domainId: string, title: string): Promise<boolean> {
    try {
      const { result, mcp_id } = execution;
      if (!result) throw new Error('No result data to save');
      
      const mcp = await this.fetchMCPById(mcp_id);
      if (!mcp) throw new Error(`MCP with ID ${mcp_id} not found`);
      
      // Extract content from the result
      const content = typeof result.content === 'string' 
        ? result.content 
        : JSON.stringify(result);
      
      // Create knowledge node
      const { error } = await supabase
        .from('knowledge_nodes')
        .insert({
          id: crypto.randomUUID(), // Generate a UUID for the node
          title: title || `${mcp.title} Result`,
          description: `Generated from MCP "${mcp.title}"`,
          type: 'mcp-result',
          domain_id: domainId,
          confidence: 1,
          discovered_in_loop: -1, // Not discovered in a loop
          metadata: {
            mcp_id: mcp_id,
            execution_id: execution.id,
            source: 'mcp-execution',
            parameters: execution.parameters
          }
        });

      if (error) throw error;
      toast.success('Saved as knowledge node');
      return true;
    } catch (error) {
      console.error('Error saving result as knowledge node:', error);
      toast.error('Failed to save as knowledge node');
      return false;
    }
  },

  /**
   * Clone a default MCP to create a customizable copy
   */
  async cloneMCP(mcpId: string): Promise<MCP | null> {
    try {
      // First fetch the MCP to clone
      const mcp = await this.fetchMCPById(mcpId);
      if (!mcp) throw new Error(`MCP with ID ${mcpId} not found`);
      
      // Create a new MCP based on the original, but with a new ID
      const newMCP: Omit<MCP, 'id' | 'created_at' | 'updated_at'> = {
        title: `${mcp.title} (Custom)`,
        description: mcp.description,
        endpoint: mcp.endpoint,
        icon: mcp.icon,
        parameters: mcp.parameters,
        isDefault: false, // Mark as not default since it's a custom copy
        category: mcp.category,
        tags: mcp.tags ? [...mcp.tags, 'custom'] : ['custom'],
        suggestedPrompt: mcp.suggestedPrompt,
        sampleUseCases: mcp.sampleUseCases,
        requiresAuth: mcp.requiresAuth,
        authType: mcp.authType,
        authKeyName: mcp.authKeyName
      };
      
      // Save the new MCP
      const createdMCP = await this.createMCP(newMCP);
      
      if (createdMCP) {
        toast.success('MCP cloned successfully');
      }
      
      return createdMCP;
    } catch (error) {
      console.error('Error cloning MCP:', error);
      toast.error('Failed to clone MCP');
      return null;
    }
  },

  /**
   * Get the authentication key for an MCP
   */
  async getMCPAuthKey(keyName: string): Promise<string | null> {
    try {
      // For now, we'll implement a simple version that returns null
      // In a real implementation, this would fetch from a secure source
      console.log(`Attempted to get auth key: ${keyName}`);
      return null;
    } catch (error) {
      console.error('Error getting MCP auth key:', error);
      return null;
    }
  },

  /**
   * Save authentication credentials for MCPs
   */
  async saveMCPAuthKey(keyName: string, keyValue: string): Promise<boolean> {
    try {
      // In a real implementation, this would store in a secure location
      console.log(`Saved auth key: ${keyName}`);
      return true;
    } catch (error) {
      console.error('Error saving MCP auth key:', error);
      return false;
    }
  }
};
