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
    // Get current user to filter MCPs
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('No authenticated user found, returning empty MCPs array');
      return [];
    }

    const { data, error } = await supabase
      .from('mcps')
      .select('*')
      .eq('user_id', user.id)  // ✅ Add user filtering
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

  // Execute an MCP with improved error handling and logging
  async executeMCP({ mcpId, parameters }: ExecuteMCPParams): Promise<MCPExecutionResult> {
    console.log('Executing MCP:', mcpId, 'with parameters:', parameters);
    
    try {
      // Get current user for authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      // First, get the MCP details with user filtering for security
      const { data: mcp, error: mcpError } = await supabase
        .from('mcps')
        .select('*')
        .eq('id', mcpId)
        .eq('user_id', user.id)  // ✅ Add user filtering for security
        .single();

      if (mcpError || !mcp) {
        console.error('MCP not found or access denied:', mcpId, mcpError);
        throw new Error('MCP not found or access denied');
      }

      console.log('Found MCP:', mcp.title, 'endpoint:', mcp.endpoint);

      // Log the execution attempt
      const { data: execution, error: executionError } = await supabase
        .from('mcp_executions')
        .insert([{
          mcp_id: mcpId,
          parameters,
          status: 'pending',
          user_id: user.id
        }])
        .select()
        .single();

      if (executionError) {
        console.warn('Failed to log execution:', executionError);
      }

      const startTime = Date.now();
      let result: any;
      let success = false;

      // Add userId to parameters for tools that need it
      const enhancedParameters = {
        ...parameters,
        userId: user.id
      };

      console.log('Calling endpoint:', mcp.endpoint, 'with parameters:', enhancedParameters);

      // Execute based on endpoint type - prioritize edge functions
      if (mcp.endpoint.startsWith('http')) {
        console.log('Making external API call to:', mcp.endpoint);
        // External API call
        const response = await fetch(mcp.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(enhancedParameters)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('External API error:', response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        result = await response.json();
        success = true;
      } else {
        console.log('Calling edge function:', mcp.endpoint);
        // Edge function call
        const { data, error } = await supabase.functions.invoke(mcp.endpoint, {
          body: enhancedParameters
        });

        console.log('Edge function response:', { data, error });

        if (error) {
          console.error('Edge function error:', error);
          throw new Error(error.message || 'Edge function execution failed');
        }

        // Handle different response formats
        if (data && data.success === false) {
          console.error('Edge function returned error:', data.error);
          throw new Error(data.error || 'Tool execution failed');
        }

        result = data && data.data ? data.data : data;
        success = true;
        console.log('Edge function execution successful:', result);
      }

      const executionTime = Date.now() - startTime;
      console.log('MCP execution completed in', executionTime, 'ms');

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
        // Ensure all required fields are present and properly typed
        const mcpToInsert = convertMCPForDatabase({
          ...mcp,
          user_id: userId,
          isDefault: true
        });

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
  },

  // Fix existing GitHub Tools MCP to use local edge function
  async fixGitHubToolsMCP(userId: string): Promise<void> {
    console.log('Fixing GitHub Tools MCP for user:', userId);
    
    try {
      // Update the GitHub Tools MCP to use the local edge function
      const { data: githubMcp, error: fetchError } = await supabase
        .from('mcps')
        .select('*')
        .eq('user_id', userId)
        .eq('default_key', 'github-tools')
        .single();

      if (fetchError || !githubMcp) {
        console.log('GitHub Tools MCP not found, will be created on next seed');
        return;
      }

      console.log('Updating GitHub Tools MCP endpoint from:', githubMcp.endpoint, 'to: github-tools');

      const { error: updateError } = await supabase
        .from('mcps')
        .update({ endpoint: 'github-tools' })
        .eq('id', githubMcp.id);

      if (updateError) {
        console.error('Error updating GitHub Tools MCP:', updateError);
        throw updateError;
      }

      console.log('Successfully fixed GitHub Tools MCP endpoint');
    } catch (error) {
      console.error('Error fixing GitHub Tools MCP:', error);
      throw error;
    }
  },

  // Clean up invalid MCPs that point to non-existent endpoints
  async cleanupInvalidMCPs(userId: string): Promise<void> {
    console.log('Cleaning up invalid MCPs for user:', userId);
    
    try {
      // Get all MCPs for the user
      const { data: mcps, error } = await supabase
        .from('mcps')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const invalidMCPs = mcps?.filter(mcp => {
        // Mark MCPs with external HTTP endpoints as potentially invalid
        // Keep only edge functions and known working endpoints
        return mcp.endpoint?.includes('api.example.com') || 
               mcp.endpoint?.includes('api.zeroloop.ai/mcp/github') ||
               (mcp.endpoint?.startsWith('http') && 
                !['google-search', 'github-tools', 'knowledge-proxy'].includes(mcp.endpoint.split('/').pop() || ''));
      }) || [];

      console.log('Found', invalidMCPs.length, 'potentially invalid MCPs');

      // Delete invalid MCPs
      for (const mcp of invalidMCPs) {
        console.log('Deleting invalid MCP:', mcp.title, 'endpoint:', mcp.endpoint);
        await this.deleteMCP(mcp.id);
      }

    } catch (error) {
      console.error('Error cleaning up invalid MCPs:', error);
      throw error;
    }
  }
};
