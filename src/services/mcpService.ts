import { supabase } from '@/integrations/supabase/client';
import { MCP, MCPExecution, ExecuteMCPParams, MCPExecutionResult, MCPParameter } from '@/types/mcp';
import { defaultMCPs } from '@/constants/defaultMCPs';

// Helper function to convert database JSON to typed arrays
const convertDatabaseMCP = (dbMCP: any): MCP => {
  return {
    ...dbMCP,
    parameters: Array.isArray(dbMCP.parameters) 
      ? dbMCP.parameters 
      : typeof dbMCP.parameters === 'string' 
        ? JSON.parse(dbMCP.parameters) 
        : [],
    tags: Array.isArray(dbMCP.tags) 
      ? dbMCP.tags 
      : typeof dbMCP.tags === 'string' 
        ? JSON.parse(dbMCP.tags) 
        : [],
    sampleUseCases: Array.isArray(dbMCP.sampleUseCases) 
      ? dbMCP.sampleUseCases 
      : typeof dbMCP.sampleUseCases === 'string' 
        ? JSON.parse(dbMCP.sampleUseCases) 
        : []
  };
};

// Helper function to convert MCP to database format
const convertMCPForDatabase = (mcp: Partial<MCP>) => {
  return {
    title: mcp.title || 'Untitled MCP',
    description: mcp.description || 'No description available',
    endpoint: mcp.endpoint || '',
    icon: mcp.icon || 'terminal',
    parameters: JSON.stringify(mcp.parameters || []),
    tags: JSON.stringify(mcp.tags || []),
    sampleUseCases: JSON.stringify(mcp.sampleUseCases || []),
    user_id: mcp.user_id,
    category: mcp.category || null,
    suggestedPrompt: mcp.suggestedPrompt || null,
    requiresAuth: mcp.requiresAuth || false,
    authType: mcp.authType || null,
    authKeyName: mcp.authKeyName || null,
    requirestoken: mcp.requirestoken || null,
    isDefault: mcp.isDefault || false,
    default_key: mcp.default_key || null
  };
};

export const mcpService = {
  // Fetch all MCPs for the current user
  async fetchMCPs(): Promise<MCP[]> {
    const { data, error } = await supabase
      .from('mcps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(convertDatabaseMCP);
  },

  // Create a new MCP
  async createMCP(mcp: Partial<MCP>): Promise<MCP> {
    const dbMCP = convertMCPForDatabase(mcp);
    
    const { data, error } = await supabase
      .from('mcps')
      .insert([dbMCP])
      .select()
      .single();

    if (error) throw error;
    return convertDatabaseMCP(data);
  },

  // Update an existing MCP
  async updateMCP(id: string, updates: Partial<MCP>): Promise<MCP> {
    const dbUpdates = convertMCPForDatabase(updates);
    
    const { data, error } = await supabase
      .from('mcps')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return convertDatabaseMCP(data);
  },

  // Delete an MCP
  async deleteMCP(id: string): Promise<void> {
    const { error } = await supabase
      .from('mcps')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Clone an MCP (create a copy)
  async cloneMCP(id: string): Promise<MCP> {
    const { data: originalMCP, error: fetchError } = await supabase
      .from('mcps')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const convertedMCP = convertDatabaseMCP(originalMCP);
    const clonedMCP = {
      ...convertedMCP,
      id: undefined,
      title: `${convertedMCP.title} (Copy)`,
      isDefault: false,
      created_at: undefined,
      updated_at: undefined
    };

    return this.createMCP(clonedMCP);
  },

  // Execute an MCP
  async executeMCP({ mcpId, parameters }: ExecuteMCPParams): Promise<MCPExecutionResult> {
    try {
      // First, get the MCP details
      const { data: mcp, error: mcpError } = await supabase
        .from('mcps')
        .select('*')
        .eq('id', mcpId)
        .single();

      if (mcpError || !mcp) {
        throw new Error('MCP not found');
      }

      // Log the execution attempt
      const { data: execution, error: executionError } = await supabase
        .from('mcp_executions')
        .insert([{
          mcp_id: mcpId,
          parameters,
          status: 'pending'
        }])
        .select()
        .single();

      if (executionError) {
        console.warn('Failed to log execution:', executionError);
      }

      const startTime = Date.now();
      let result: any;
      let success = false;

      // Execute based on endpoint type
      if (mcp.endpoint.startsWith('http')) {
        // External API call
        const response = await fetch(mcp.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parameters)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        result = await response.json();
        success = true;
      } else {
        // Edge function call
        const { data, error } = await supabase.functions.invoke(mcp.endpoint, {
          body: parameters
        });

        if (error) {
          throw new Error(error.message || 'Edge function execution failed');
        }

        result = data;
        success = true;
      }

      const executionTime = Date.now() - startTime;

      // Update execution record if it was created
      if (execution) {
        await supabase
          .from('mcp_executions')
          .update({
            result,
            status: 'completed',
            execution_time: executionTime
          })
          .eq('id', execution.id);
      }

      return {
        success,
        data: result,
        error: null,
        status: 'completed'
      };

    } catch (error) {
      console.error('MCP execution error:', error);
      
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'failed'
      };
    }
  },

  // Seed default MCPs for a user with corrected endpoints
  async seedDefaultMCPs(userId: string): Promise<void> {
    console.log('Seeding default MCPs for user:', userId);
    
    try {
      // Check if default MCPs already exist
      const { data: existingMCPs, error: checkError } = await supabase
        .from('mcps')
        .select('default_key')
        .eq('user_id', userId)
        .eq('isDefault', true);

      if (checkError) {
        console.error('Error checking existing MCPs:', checkError);
        throw checkError;
      }

      const existingKeys = existingMCPs?.map(mcp => mcp.default_key) || [];
      console.log('Existing MCP keys:', existingKeys);

      // Filter out MCPs that already exist
      const mcpsToCreate = defaultMCPs.filter(mcp => !existingKeys.includes(mcp.default_key));
      console.log('MCPs to create:', mcpsToCreate.length);

      if (mcpsToCreate.length === 0) {
        console.log('All default MCPs already exist');
        return;
      }

      // Process each MCP individually to ensure proper typing
      for (const mcp of mcpsToCreate) {
        let correctedEndpoint = mcp.endpoint;
        
        // Fix endpoints that point to external APIs
        switch (mcp.default_key) {
          case 'github':
            correctedEndpoint = 'github-tools'; // This would need to be created
            break;
          case 'filesystem':
            correctedEndpoint = 'file-system'; // This would need to be created
            break;
          case 'database':
            correctedEndpoint = 'database-query'; // This would need to be created
            break;
          case 'knowledge-search':
            correctedEndpoint = 'knowledge-proxy'; // This already exists
            break;
          case 'google-search':
            correctedEndpoint = 'google-search'; // This already exists
            break;
        }

        // Ensure all required fields are present and properly typed
        const mcpToInsert = {
          title: mcp.title || 'Untitled MCP',
          description: mcp.description || 'No description available',
          endpoint: correctedEndpoint,
          icon: mcp.icon || 'terminal',
          parameters: JSON.stringify(mcp.parameters || []),
          tags: JSON.stringify(mcp.tags || []),
          sampleUseCases: JSON.stringify(mcp.sampleUseCases || []),
          user_id: userId,
          isDefault: true,
          default_key: mcp.default_key,
          category: mcp.category || null,
          suggestedPrompt: mcp.suggestedPrompt || null,
          requiresAuth: mcp.requiresAuth || false,
          authType: mcp.authType || null,
          authKeyName: mcp.authKeyName || null,
          requirestoken: mcp.requirestoken || null
        };

        // Insert the MCP
        const { error: insertError } = await supabase
          .from('mcps')
          .insert([mcpToInsert]);

        if (insertError) {
          console.error('Error inserting MCP:', mcp.title, insertError);
          throw insertError;
        }
      }

      console.log('Successfully seeded', mcpsToCreate.length, 'default MCPs');
    } catch (error) {
      console.error('Error in seedDefaultMCPs:', error);
      throw error;
    }
  }
};
