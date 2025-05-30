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
    // First, check if agent has ANY tool configurations (active or inactive)
    const { data: allAgentConfigs, error: configCheckError } = await supabase
      .from('agent_tool_configs')
      .select('id, is_active')
      .eq('agent_id', agentId);

    if (configCheckError) {
      console.error('❌ Error checking agent tool configs:', configCheckError);
      console.log('⚠️ Returning empty tools array due to query error');
      return [];
    }

    // If agent has explicit configurations, respect them strictly
    if (allAgentConfigs && allAgentConfigs.length > 0) {
      console.log(`🔧 Agent has ${allAgentConfigs.length} explicit tool configurations`);
      
      // Check how many are active
      const activeCount = allAgentConfigs.filter(config => config.is_active).length;
      console.log(`📊 Active tools: ${activeCount} / ${allAgentConfigs.length}`);
      
      if (activeCount === 0) {
        console.log('🚫 Agent has explicit tool configs but NONE are active - NO TOOLS AVAILABLE');
        console.log('🔒 Respecting user choice: agent intentionally has no tools enabled');
        return [];
      }

      // Fetch only the active tool configurations with MCP details
      const { data: activeToolConfigs, error: activeError } = await supabase
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

      if (activeError) {
        console.error('❌ Error fetching active agent tool configs:', activeError);
        return [];
      }

      // Transform the data to include custom configurations that override defaults
      const enabledTools = (activeToolConfigs || [])
        .filter(config => config.mcps) // Ensure MCP data exists
        .map(config => {
          const mcp = config.mcps;
          
          // Apply custom configurations that override defaults
          return {
            ...mcp,
            // Override with custom configurations if provided, otherwise use defaults
            title: config.custom_title || mcp.title,
            description: config.custom_description || mcp.description,
            // Use custom use cases if provided, otherwise fall back to default sample use cases
            sampleUseCases: (config.custom_use_cases && config.custom_use_cases.length > 0) 
              ? config.custom_use_cases 
              : mcp.sampleUseCases,
            // Add priority from custom configuration
            priority: config.priority_override || mcp.priority || 1,
            // Keep reference to all configuration data for debugging
            agent_config: {
              custom_title: config.custom_title,
              custom_description: config.custom_description,
              custom_use_cases: config.custom_use_cases,
              priority_override: config.priority_override,
              is_active: config.is_active
            }
          };
        });

      console.log(`✅ Found ${enabledTools.length} ACTIVE enabled tools for agent ${agentId}:`, 
        enabledTools.map(t => t.title).join(', '));

      // Log custom configurations being applied
      enabledTools.forEach(tool => {
        if (tool.agent_config.custom_title || tool.agent_config.custom_description || 
            (tool.agent_config.custom_use_cases && tool.agent_config.custom_use_cases.length > 0)) {
          console.log(`🎨 Tool "${tool.title}" has custom configurations:`, {
            customTitle: tool.agent_config.custom_title,
            customDescription: !!tool.agent_config.custom_description,
            customUseCases: tool.agent_config.custom_use_cases?.length || 0
          });
        }
      });

      return enabledTools;
    } else {
      // Agent has NO configurations at all - this is a completely new agent
      console.log('🆕 Agent has no tool configurations at all - this is a new agent');
      console.log('⚠️ Will use default tools for new agent, but configurations should be set up');
      return getDefaultTools(supabase);
    }

  } catch (error) {
    console.error('❌ Exception fetching agent tools:', error);
    console.log('⚠️ Returning empty tools array due to exception');
    return [];
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
 * Sets up default tool configurations for a COMPLETELY NEW agent
 */
export async function setupDefaultToolsForAgent(agentId: string, supabase: any): Promise<void> {
  console.log(`🔧 Checking if agent needs default tool setup: ${agentId}`);
  
  try {
    // Check if agent already has ANY tool configurations (active OR inactive)
    const { data: existingConfigs, error: checkError } = await supabase
      .from('agent_tool_configs')
      .select('id')
      .eq('agent_id', agentId)
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking existing tool configs:', checkError);
      return;
    }

    if (existingConfigs && existingConfigs.length > 0) {
      console.log('🔒 Agent already has tool configurations - SKIPPING default setup');
      console.log('📋 Respecting existing user configuration choices');
      return;
    }

    console.log('🆕 Agent has NO configurations - setting up defaults for new agent');

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
      custom_use_cases: null
    }));

    const { error: insertError } = await supabase
      .from('agent_tool_configs')
      .insert(defaultConfigs);

    if (insertError) {
      console.error('❌ Error setting up default tool configs:', insertError);
      return;
    }

    console.log(`✅ Set up ${coreTools.length} default tools for NEW agent:`, 
      coreTools.map(t => t.title).join(', '));

  } catch (error) {
    console.error('❌ Exception setting up default tools:', error);
  }
}
