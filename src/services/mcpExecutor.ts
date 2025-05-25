
import { supabase } from '@/integrations/supabase/client';
import { MCP, ExecuteMCPParams, MCPExecutionResult } from '@/types/mcp';
import { v4 as uuidv4 } from 'uuid';
import { getTokenForProvider } from '@/services/tokenService';
import { toast } from '@/components/ui/sonner';

/**
 * Service for executing MCPs with proper error handling and logging
 */

class MCPExecutor {
  /**
   * Generate a unique ID for each execution
   */
  private generateExecutionId(): string {
    return uuidv4();
  }

  /**
   * Record the start of an MCP execution in the database
   */
  private async recordExecution(executionId: string, mcpId: string, parameters: Record<string, any>, userId?: string) {
    try {
      const { error } = await supabase
        .from('mcp_executions')
        .insert([{
          id: executionId,
          mcp_id: mcpId,
          parameters: parameters,
          status: 'running',
          user_id: userId
        }]);
        
      if (error) {
        console.warn('Failed to record execution:', error);
        toast.error('Failed to record execution start');
        throw error;
      }
    } catch (e) {
      console.error('Error recording execution:', e);
      throw e;
    }
  }

  /**
   * Update execution record with completion status
   */
  private async updateExecutionRecord(executionId: string, status: 'completed' | 'failed', result?: any, error?: string) {
    try {
      const { error: updateError } = await supabase
        .from('mcp_executions')
        .update({
          status,
          result: result || null,
          error: error || null,
        })
        .eq('id', executionId);
        
      if (updateError) {
        console.warn('Failed to update execution record:', updateError);
      }
    } catch (updateError) {
      console.warn('Error updating execution record:', updateError);
    }
  }

  /**
   * Execute a Supabase Edge Function
   */
  private async executeEdgeFunction(mcp: MCP, parameters: Record<string, any>, executionId: string, headers: Record<string, string>) {
    // Special handling for knowledge-proxy - send parameters directly
    let requestBody;
    if (mcp.endpoint === 'knowledge-proxy') {
      requestBody = {
        ...parameters,
        executionId: executionId
      };
    } else {
      // For other functions, use the original format
      requestBody = { 
        action: mcp.default_key || mcp.id, 
        parameters: parameters, 
        executionId 
      };
    }
    
    console.log('About to invoke edge function:', {
      endpoint: mcp.endpoint,
      bodySize: JSON.stringify(requestBody).length,
      headers: headers
    });
    
    try {
      // Try the Supabase client method first
      const { data, error } = await supabase.functions.invoke(mcp.endpoint, {
        body: requestBody,
        headers: headers
      });
      
      if (error) {
        console.error('Edge function client error:', error);
        throw new Error(`Edge function error: ${error.message}`);
      }
      
      return data;
    } catch (e) {
      console.error('Edge function execution error:', e);
      throw new Error(`Failed to execute edge function: ${e.message}`);
    }
  }

  /**
   * Execute an external API call
   */
  private async executeExternalAPI(mcp: MCP, parameters: Record<string, any>, executionId: string, headers: Record<string, string>) {
    try {
      console.log(`Calling external API: ${mcp.endpoint}`);
      const apiResponse = await fetch(mcp.endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ action: mcp.id, parameters: parameters, executionId }),
      });
      
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`API error: ${apiResponse.status} ${apiResponse.statusText}`, errorText);
        throw new Error(`API error: ${apiResponse.status} ${apiResponse.statusText}. ${errorText}`);
      }
      
      return await apiResponse.json();
    } catch (e) {
      console.error('API execution error:', e);
      throw new Error(`Failed to call API: ${e.message}`);
    }
  }

  /**
   * Execute an MCP with authorization if needed
   */
  async execute(params: ExecuteMCPParams, mcp: MCP): Promise<MCPExecutionResult> {
    try {
      // Get the current authenticated user
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      console.log('Executing MCP:', mcp.title, 'with parameters:', params.parameters);
      
      // Generate a unique ID for this execution
      const executionId = this.generateExecutionId();
      
      // Record the execution start in the database
      await this.recordExecution(executionId, params.mcpId, params.parameters, userId);
      
      // Prepare request headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-execution-id': executionId,
      };
      
      // Check if this MCP requires a provider token
      if (mcp.requirestoken) {
        const token = await getTokenForProvider(mcp.requirestoken);
        if (token) {
          headers['x-provider-token'] = token;
          console.log(`Using token for provider: ${mcp.requirestoken}`);
        } else {
          console.warn(`Token required for ${mcp.requirestoken} but not found`);
        }
      }
      
      // Execute the API call based on the endpoint type
      let response;
      
      // Is this a Supabase Edge Function?
      if (mcp.endpoint.indexOf('http') !== 0) {
        console.log('Executing as Supabase Edge Function:', mcp.endpoint);
        response = await this.executeEdgeFunction(mcp, params.parameters, executionId, headers);
      } else {
        // It's an external API
        response = await this.executeExternalAPI(mcp, params.parameters, executionId, headers);
      }
      
      console.log('MCP execution response:', response);
      
      // Update the execution record with success
      await this.updateExecutionRecord(executionId, 'completed', response);
      
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
}

export const mcpExecutor = new MCPExecutor();
