
import { supabase } from '@/integrations/supabase/client';
import { MCP, MCPExecution, ExecuteMCPParams, MCPExecutionResult } from '@/types/mcp';
import { v4 as uuidv4 } from 'uuid';
import { getTokenForProvider } from '@/services/tokenService';

/**
 * Generate a unique ID for each execution
 */
function generateExecutionId(): string {
  return uuidv4();
}

/**
 * Record the start of an MCP execution in the database
 */
async function recordExecution(executionId: string, mcpId: string, parameters: Record<string, any>) {
  try {
    const { error } = await supabase
      .from('mcp_executions')
      .insert([{
        id: executionId,
        mcp_id: mcpId,
        parameters: parameters,
        status: 'running',
        started_at: new Date().toISOString()
      }]);
      
    if (error) {
      console.warn('Failed to record execution:', error);
    }
  } catch (e) {
    console.error('Error recording execution:', e);
  }
}

/**
 * Execute an MCP with authorization if needed
 */
async function executeMCP(params: ExecuteMCPParams): Promise<MCPExecutionResult> {
  try {
    // First, we need to get the MCP details
    const { data: mcp, error: fetchError } = await supabase
      .from('mcps')
      .select('*')
      .eq('id', params.mcpId)
      .single();
    
    if (fetchError || !mcp) {
      throw new Error(`Failed to fetch MCP: ${fetchError?.message || 'MCP not found'}`);
    }
    
    console.log('Executing MCP:', mcp.title, 'with parameters:', params.parameters);
    
    // Generate a unique ID for this execution
    const executionId = generateExecutionId();
    
    // Record the execution start in the database
    await recordExecution(executionId, params.mcpId, params.parameters);
    
    // Prepare request headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-execution-id': executionId,
    };
    
    // Check if this MCP requires a provider token
    if (mcp.requiresToken) {
      const token = await getTokenForProvider(mcp.requiresToken);
      if (token) {
        headers['x-provider-token'] = token;
        console.log(`Using token for provider: ${mcp.requiresToken}`);
      } else {
        console.warn(`Token required for ${mcp.requiresToken} but not found`);
      }
    }
    
    // Execute the API call based on the endpoint type
    let response;
    
    // Is this a Supabase Edge Function?
    if (mcp.endpoint.indexOf('http') !== 0) {
      console.log('Executing as Supabase Edge Function:', mcp.endpoint);
      
      // It's an Edge Function
      try {
        const { data, error } = await supabase.functions.invoke(mcp.endpoint, {
          body: { action: mcp.id, parameters: params.parameters },
          headers: headers
        });
        
        if (error) {
          throw new Error(`Edge function error: ${error.message}`);
        }
        
        response = data;
      } catch (e) {
        console.error('Edge function execution error:', e);
        throw new Error(`Failed to execute edge function: ${e.message}`);
      }
    } else {
      // It's an external API
      try {
        const apiResponse = await fetch(mcp.endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ action: mcp.id, parameters: params.parameters }),
        });
        
        if (!apiResponse.ok) {
          throw new Error(`API error: ${apiResponse.status} ${apiResponse.statusText}`);
        }
        
        response = await apiResponse.json();
      } catch (e) {
        console.error('API execution error:', e);
        throw new Error(`Failed to call API: ${e.message}`);
      }
    }
    
    console.log('MCP execution response:', response);
    
    // Update the execution record with success
    try {
      const { error } = await supabase
        .from('mcp_executions')
        .update({
          status: 'completed',
          result: response,
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId);
        
      if (error) {
        console.warn('Failed to update execution record:', error);
      }
    } catch (updateError) {
      console.warn('Error updating execution record:', updateError);
    }
    
    return {
      success: true,
      data: response,
      status: 'completed',
      result: response,
      error: null
    };
  } catch (error) {
    console.error('MCP execution error:', error);
    
    return {
      success: false,
      data: null,
      status: 'failed',
      result: null,
      error: error.message || 'Unknown error occurred during execution'
    };
  }
}

/**
 * Fetch a list of available MCPs from the database
 */
async function fetchMCPs(): Promise<MCP[]> {
  try {
    const { data, error } = await supabase
      .from('mcps')
      .select('*')
      .order('title', { ascending: true });
    
    if (error) {
      console.error('Error fetching MCPs:', error);
      return [];
    }
    
    return data as unknown as MCP[];
  } catch (error) {
    console.error('Error in fetchMCPs:', error);
    return [];
  }
}

/**
 * Fetch a single MCP by ID
 */
async function fetchMCPById(id: string): Promise<MCP | null> {
  try {
    const { data, error } = await supabase
      .from('mcps')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching MCP by ID:', error);
      return null;
    }
    
    return data as unknown as MCP;
  } catch (error) {
    console.error('Error in fetchMCPById:', error);
    return null;
  }
}

/**
 * Create a new MCP
 */
async function createMCP(mcp: Partial<MCP>): Promise<MCP | null> {
  try {
    // Convert parameters to a stringified JSON before sending to DB
    const mcpForDb = {
      ...mcp,
      parameters: JSON.stringify(mcp.parameters || []),
      tags: JSON.stringify(mcp.tags || []),
      sampleUseCases: JSON.stringify(mcp.sampleUseCases || [])
    };
    
    const { data, error } = await supabase
      .from('mcps')
      .insert(mcpForDb)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating MCP:', error);
      return null;
    }
    
    // Convert stringified JSON back to objects
    const result = {
      ...data,
      parameters: typeof data.parameters === 'string' ? JSON.parse(data.parameters) : data.parameters,
      tags: typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags,
      sampleUseCases: typeof data.sampleUseCases === 'string' ? JSON.parse(data.sampleUseCases) : data.sampleUseCases
    } as MCP;
    
    return result;
  } catch (error) {
    console.error('Error in createMCP:', error);
    return null;
  }
}

/**
 * Update an existing MCP
 */
async function updateMCP(id: string, updates: Partial<MCP>): Promise<MCP | null> {
  try {
    // Convert complex objects to JSON strings
    const updatesForDb = {
      ...updates,
      parameters: updates.parameters ? JSON.stringify(updates.parameters) : undefined,
      tags: updates.tags ? JSON.stringify(updates.tags) : undefined,
      sampleUseCases: updates.sampleUseCases ? JSON.stringify(updates.sampleUseCases) : undefined
    };
    
    const { data, error } = await supabase
      .from('mcps')
      .update(updatesForDb)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating MCP:', error);
      return null;
    }
    
    // Convert JSON strings back to objects
    const result = {
      ...data,
      parameters: typeof data.parameters === 'string' ? JSON.parse(data.parameters) : data.parameters,
      tags: typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags,
      sampleUseCases: typeof data.sampleUseCases === 'string' ? JSON.parse(data.sampleUseCases) : data.sampleUseCases
    } as MCP;
    
    return result;
  } catch (error) {
    console.error('Error in updateMCP:', error);
    return null;
  }
}

/**
 * Delete an MCP
 */
async function deleteMCP(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('mcps')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting MCP:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteMCP:', error);
    return false;
  }
}

/**
 * Clone an existing MCP
 */
async function cloneMCP(id: string): Promise<MCP | null> {
  try {
    // First, get the MCP to clone
    const original = await fetchMCPById(id);
    
    if (!original) {
      throw new Error('MCP not found');
    }
    
    // Create a new MCP based on the original
    const clone = {
      ...original,
      id: undefined, // Let Supabase generate a new ID
      title: `Copy of ${original.title}`,
      isDefault: false, // Never clone as a default
      created_at: undefined, // Let Supabase set this
      updated_at: undefined,
    };
    
    return await createMCP(clone);
  } catch (error) {
    console.error('Error in cloneMCP:', error);
    return null;
  }
}

/**
 * Seed default MCPs if they don't exist
 */
async function seedDefaultMCPs(userId?: string): Promise<boolean> {
  try {
    console.log('Seeding default MCPs for user:', userId);
    
    // Check if any default MCPs exist
    const { data: defaultMCPs, error } = await supabase
      .from('mcps')
      .select('id')
      .eq('isDefault', true)
      .limit(1);
      
    if (error) {
      console.error('Error checking for default MCPs:', error);
      return false;
    }
    
    // If we already have default MCPs, don't seed
    if (defaultMCPs && defaultMCPs.length > 0) {
      console.log('Default MCPs already exist, skipping seed.');
      return true;
    }
    
    // Import default MCPs from constants
    const { defaultMCPs: mcpsToSeed } = await import('@/constants/defaultMCPs');
    
    // Process MCPs for database insertion
    const processedMcps = mcpsToSeed.map(mcp => ({
      ...mcp,
      parameters: JSON.stringify(mcp.parameters || []),
      tags: JSON.stringify(mcp.tags || []),
      sampleUseCases: JSON.stringify(mcp.sampleUseCases || []),
      user_id: userId
    }));
    
    // Insert all default MCPs
    for (const mcp of processedMcps) {
      const { error: insertError } = await supabase
        .from('mcps')
        .insert(mcp);
        
      if (insertError) {
        console.error('Error inserting default MCP:', insertError);
        return false;
      }
    }
    
    console.log('Successfully seeded default MCPs.');
    return true;
  } catch (error) {
    console.error('Error in seedDefaultMCPs:', error);
    return false;
  }
}

// Export the service methods as an object
export const mcpService = {
  executeMCP,
  fetchMCPs,
  fetchMCPById,
  createMCP,
  updateMCP,
  deleteMCP,
  cloneMCP,
  seedDefaultMCPs
};
