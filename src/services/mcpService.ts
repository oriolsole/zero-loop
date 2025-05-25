
import { supabase } from '@/integrations/supabase/client';
import { MCP, ExecuteMCPParams, MCPExecutionResult } from '@/types/mcp';
import { mcpDataTransformer } from './mcpDataTransformer';
import { mcpExecutor } from './mcpExecutor';

/**
 * Simplified MCP service focusing on CRUD operations and delegation
 */

/**
 * Execute an MCP by delegating to the executor service
 */
async function executeMCP(params: ExecuteMCPParams): Promise<MCPExecutionResult> {
  try {
    // First, get the MCP details
    const mcp = await fetchMCPById(params.mcpId);
    
    if (!mcp) {
      throw new Error(`Failed to fetch MCP: MCP not found`);
    }
    
    // Delegate to the executor service
    return await mcpExecutor.execute(params, mcp);
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
    
    return (data as any[]).map(item => mcpDataTransformer.fromDatabase(item));
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
    
    return mcpDataTransformer.fromDatabase(data);
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
    const mcpForDb = mcpDataTransformer.forCreation(mcp);
    
    const { data, error } = await supabase
      .from('mcps')
      .insert(mcpForDb)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating MCP:', error);
      return null;
    }
    
    return mcpDataTransformer.fromDatabase(data);
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
    const updatesForDb = mcpDataTransformer.toDatabase(updates);
    
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
    
    return mcpDataTransformer.fromDatabase(data);
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
    const clone: Partial<MCP> = {
      title: `Copy of ${original.title}`,
      description: original.description,
      endpoint: original.endpoint,
      icon: original.icon,
      parameters: original.parameters,
      tags: original.tags,
      sampleUseCases: original.sampleUseCases,
      isDefault: false, // Never clone as a default
      category: original.category,
      default_key: original.default_key,
      requiresAuth: original.requiresAuth,
      authType: original.authType,
      authKeyName: original.authKeyName,
      requirestoken: original.requirestoken,
      user_id: original.user_id
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
    
    // If we already have default MCPs, check if we need to update the knowledge search endpoint
    if (defaultMCPs && defaultMCPs.length > 0) {
      console.log('Default MCPs already exist, checking for knowledge search updates...');
      
      // Update the knowledge search MCP to use the correct endpoint
      const { error: updateError } = await supabase
        .from('mcps')
        .update({ endpoint: 'knowledge-proxy' })
        .eq('default_key', 'knowledge-search-v2')
        .eq('isDefault', true);
        
      if (updateError) {
        console.error('Error updating knowledge search MCP:', updateError);
      } else {
        console.log('Successfully updated knowledge search MCP endpoint to use knowledge-proxy');
      }
      
      return true;
    }
    
    // Import default MCPs from constants
    const { defaultMCPs: mcpsToSeed } = await import('@/constants/defaultMCPs');
    
    // Process MCPs for database insertion - insert one by one to ensure schema compliance
    for (const mcp of mcpsToSeed) {
      try {
        const mcpForDb = mcpDataTransformer.forCreation({
          ...mcp,
          isDefault: true,
          user_id: userId || null
        });
        
        const { error: insertError } = await supabase
          .from('mcps')
          .insert(mcpForDb);
          
        if (insertError) {
          console.error('Error inserting default MCP:', insertError);
          return false;
        }
      } catch (mcpError) {
        console.error('Skipping MCP due to validation error:', mcpError);
        continue;
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
