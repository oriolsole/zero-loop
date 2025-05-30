
/**
 * Agent Tool Configuration Fetcher
 * Fetches and manages agent-specific tool configurations
 */

/**
 * Fetches enabled tools for a specific agent
 */
export async function getAgentEnabledTools(agentId: string | null, supabase: any): Promise<any[]> {
  console.log(`🔧 Fetching enabled tools for agent: ${agentId}`);
  
  if (!agentId) {
    console.log('⚠️ No agent ID provided, falling back to default tools');
    return getDefaultTools(supabase);
  }

  try {
    // Fetch agent tool configurations with MCP details - removing priority column reference
    const { data: agentToolConfigs, error } = await supabase
      .from('agent_tool_configs')
      .select(`
        *,
        mcps:mcp_id (
          id,
          title,
          description,
          endpoint,
          icon,
          parameters,
          default_key,
          category,
          tags,
          suggestedPrompt,
          sampleUseCases,
          requiresAuth,
          authType,
          authKeyName,
          requirestoken,
          isDefault
        )
      `)
      .eq('agent_id', agentId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching agent tool configs:', error);
      return getDefaultTools(supabase);
    }

    if (!agentToolConfigs || agentToolConfigs.length === 0) {
      console.log('⚠️ No tool configurations found for agent, using default tools');
      return getDefaultTools(supabase);
    }

    // Transform the data to include custom configurations
    const enabledTools = agentToolConfigs
      .filter(config => config.mcps) // Ensure MCP data exists
      .map(config => {
        const mcp = config.mcps;
        
        // Apply custom configurations
        return {
          ...mcp,
          // Override with custom configurations if provided
          title: config.custom_title || mcp.title,
          description: config.custom_description || mcp.description,
          priority: config.priority_override || 5, // Default priority if not set
          custom_use_cases: config.custom_use_cases || [],
          // Keep reference to original config
          agent_config: {
            custom_title: config.custom_title,
            custom_description: config.custom_description,
            priority_override: config.priority_override,
            custom_use_cases: config.custom_use_cases
          }
        };
      });

    console.log(`✅ Found ${enabledTools.length} enabled tools for agent ${agentId}:`, 
      enabledTools.map(t => t.title).join(', '));

    return enabledTools;

  } catch (error) {
    console.error('❌ Exception fetching agent tools:', error);
    return getDefaultTools(supabase);
  }
}

/**
 * Fetches default tools when no agent-specific configuration exists
 */
async function getDefaultTools(supabase: any): Promise<any[]> {
  console.log('🔧 Fetching default tools');
  
  try {
    const { data: mcps, error } = await supabase
      .from('mcps')
      .select('*')
      .eq('isDefault', true)
      .in('default_key', ['web-search', 'github-tools', 'knowledge-search', 'jira-tools', 'web-scraper']);

    if (error) {
      console.error('❌ Error fetching default tools:', error);
      return [];
    }

    console.log(`✅ Found ${mcps?.length || 0} default tools:`, 
      mcps?.map(t => t.title).join(', ') || 'none');

    return mcps || [];
  } catch (error) {
    console.error('❌ Exception fetching default tools:', error);
    return [];
  }
}

/**
 * Sets up default tool configurations for an agent
 */
export async function setupDefaultToolsForAgent(agentId: string, supabase: any): Promise<void> {
  console.log(`🔧 Setting up default tools for agent: ${agentId}`);
  
  try {
    // Check if agent already has tool configurations
    const { data: existingConfigs } = await supabase
      .from('agent_tool_configs')
      .select('id')
      .eq('agent_id', agentId)
      .limit(1);

    if (existingConfigs && existingConfigs.length > 0) {
      console.log('⚠️ Agent already has tool configurations, skipping default setup');
      return;
    }

    // Get core default tools
    const coreToolKeys = ['web-search', 'knowledge-search', 'web-scraper', 'github-tools'];
    
    const { data: coreTools, error } = await supabase
      .from('mcps')
      .select('id, default_key, title')
      .eq('isDefault', true)
      .in('default_key', coreToolKeys);

    if (error) {
      console.error('❌ Error fetching core tools for setup:', error);
      return;
    }

    if (!coreTools || coreTools.length === 0) {
      console.log('⚠️ No core tools found for default setup');
      return;
    }

    // Create default configurations
    const defaultConfigs = coreTools.map(tool => ({
      agent_id: agentId,
      mcp_id: tool.id,
      is_active: true,
      custom_title: null,
      custom_description: null,
      priority_override: null,
      custom_use_cases: null
    }));

    const { error: insertError } = await supabase
      .from('agent_tool_configs')
      .insert(defaultConfigs);

    if (insertError) {
      console.error('❌ Error setting up default tool configs:', insertError);
      return;
    }

    console.log(`✅ Set up ${coreTools.length} default tools for agent:`, 
      coreTools.map(t => t.title).join(', '));

  } catch (error) {
    console.error('❌ Exception setting up default tools:', error);
  }
}
