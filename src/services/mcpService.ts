
import { supabase } from '@/integrations/supabase/client';
import { MCP, MCPExecution, ExecuteMCPParams } from '@/types/mcp';
import { toast } from '@/components/ui/sonner';

export const mcpService = {
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
      return data || [];
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
      return data;
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
      const { data, error } = await supabase
        .from('mcps')
        .insert(mcp)
        .select()
        .single();

      if (error) throw error;
      toast.success('MCP created successfully');
      return data;
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
      const { data, error } = await supabase
        .from('mcps')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('MCP updated successfully');
      return data;
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
          parameters,
          status: 'running'
        })
        .select()
        .single();

      if (executionError) throw executionError;
      
      // Get the MCP details
      const mcp = await this.fetchMCPById(mcpId);
      if (!mcp) throw new Error(`MCP with ID ${mcpId} not found`);
      
      const startTime = Date.now();
      
      try {
        // Execute the MCP by calling its endpoint
        const response = await fetch(mcp.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
            result,
            execution_time: executionTime
          })
          .eq('id', executionData.id)
          .select()
          .single();
          
        if (updateError) throw updateError;
        
        toast.success('MCP executed successfully');
        return updatedExecution;
      } catch (error) {
        // Update execution record with error
        const { data: failedExecution } = await supabase
          .from('mcp_executions')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            execution_time: Date.now() - startTime
          })
          .eq('id', executionData.id)
          .select()
          .single();
          
        console.error(`MCP execution failed:`, error);
        toast.error('MCP execution failed');
        return failedExecution;
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
      return data || [];
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
  }
};
