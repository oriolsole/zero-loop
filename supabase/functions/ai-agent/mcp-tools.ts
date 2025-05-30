
/**
 * MCP (Model Control Protocol) tools utilities with enhanced descriptions
 */

/**
 * Converts MCPs to OpenAI function definitions with enhanced metadata
 */
export function convertMCPsToTools(mcps: any[]): any[] {
  return mcps?.map(mcp => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    let parameters;
    try {
      parameters = typeof mcp.parameters === 'string' 
        ? JSON.parse(mcp.parameters) 
        : mcp.parameters || [];
    } catch (e) {
      console.warn('Failed to parse parameters for MCP:', mcp.id);
      parameters = [];
    }

    parameters.forEach((param: any) => {
      properties[param.name] = {
        type: param.type === 'number' ? 'number' : 'string',
        description: param.description || `${param.name} parameter`
      };

      if (param.enum && Array.isArray(param.enum)) {
        properties[param.name].enum = param.enum;
      }

      if (param.required) {
        required.push(param.name);
      }
    });

    // Use custom title and description if available from agent configuration
    const displayTitle = mcp.title; // This already includes custom title from agent config
    const displayDescription = mcp.description; // This already includes custom description from agent config
    
    // Enhance the function description with trigger phrases and use cases
    let enhancedDescription = displayDescription;
    
    // Add custom use cases if available from agent configuration
    if (mcp.custom_use_cases && Array.isArray(mcp.custom_use_cases) && mcp.custom_use_cases.length > 0) {
      const useCaseExamples = mcp.custom_use_cases.slice(0, 2).join('. ');
      enhancedDescription += ` Agent-specific use cases: ${useCaseExamples}`;
    }
    // Fallback to original sample use cases
    else if (mcp.sampleUseCases && Array.isArray(mcp.sampleUseCases)) {
      const triggerExamples = mcp.sampleUseCases.slice(0, 2).join('. ');
      enhancedDescription += ` Examples: ${triggerExamples}`;
    }

    // Add specific action guidance for Jira
    if (mcp.default_key === 'jira-tools') {
      enhancedDescription += ' Use "list_projects" action for project requests like "retrieve projects", "show my projects".';
    }

    // Add specific guidance for Knowledge Base
    if (mcp.default_key === 'knowledge-search-v2' || mcp.default_key === 'knowledge-search') {
      enhancedDescription += ' ONLY searches internal/uploaded content, NOT external web content.';
    }

    // Add specific guidance for Web Search
    if (mcp.default_key === 'web-search') {
      enhancedDescription += ' ONLY searches external web content, NOT internal documents or Jira projects.';
    }

    console.log(`🔧 Converting tool ${displayTitle} (${mcp.default_key}) with ${Object.keys(properties).length} parameters`);

    return {
      type: 'function',
      function: {
        name: `execute_${mcp.default_key || mcp.id}`,
        description: enhancedDescription,
        parameters: {
          type: 'object',
          properties,
          required
        }
      }
    };
  }) || [];
}
