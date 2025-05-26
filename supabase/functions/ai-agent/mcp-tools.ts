
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

    // Enhance the function description with trigger phrases and use cases
    let enhancedDescription = mcp.description;
    
    // Add trigger phrases if available in sample use cases
    if (mcp.sampleUseCases && Array.isArray(mcp.sampleUseCases)) {
      const triggerExamples = mcp.sampleUseCases.slice(0, 2).join('. ');
      enhancedDescription += ` Examples: ${triggerExamples}`;
    }

    // Add specific action guidance for Jira
    if (mcp.default_key === 'jira-tools') {
      enhancedDescription += ' Use "list_projects" action for project requests like "retrieve projects", "show my projects".';
    }

    // Add specific guidance for Knowledge Base
    if (mcp.default_key === 'knowledge-search-v2') {
      enhancedDescription += ' ONLY searches internal/uploaded content, NOT external web content.';
    }

    // Add specific guidance for Web Search
    if (mcp.default_key === 'web-search') {
      enhancedDescription += ' ONLY searches external web content, NOT internal documents or Jira projects.';
    }

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
