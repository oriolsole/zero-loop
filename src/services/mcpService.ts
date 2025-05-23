
import { supabase } from '@/integrations/supabase/client';
import { MCP } from '@/types/mcp';
import { v4 as uuidv4 } from 'uuid';
import { getTokenForProvider } from './tokenService';

// Define the MCPExecutionResult type
export interface MCPExecutionResult {
  success: boolean;
  data: any;
  error: string | null;
}

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
async function executeMCP(mcp: MCP, parameters: Record<string, any>): Promise<MCPExecutionResult> {
  try {
    console.log('Executing MCP:', mcp.title, 'with parameters:', parameters);
    
    // Generate a unique ID for this execution
    const executionId = generateExecutionId();
    
    // Record the execution start in the database
    await recordExecution(executionId, mcp.id, parameters);
    
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
          body: { action: mcp.id, parameters },
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
          body: JSON.stringify({ action: mcp.id, parameters }),
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
      error: null
    };
  } catch (error) {
    console.error('MCP execution error:', error);
    
    return {
      success: false,
      data: null,
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
    
    return data as MCP[];
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
    
    return data as MCP;
  } catch (error) {
    console.error('Error in fetchMCPById:', error);
    return null;
  }
}

// Export the service methods as an object
export const mcpService = {
  executeMCP,
  fetchMCPs,
  fetchMCPById
};
