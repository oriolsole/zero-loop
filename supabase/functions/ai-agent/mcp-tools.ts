
/**
 * MCP (Model Control Protocol) tools utilities
 */

/**
 * Converts MCPs to OpenAI function definitions
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

    return {
      type: 'function',
      function: {
        name: `execute_${mcp.default_key || mcp.id}`,
        description: mcp.description,
        parameters: {
          type: 'object',
          properties,
          required
        }
      }
    };
  }) || [];
}
