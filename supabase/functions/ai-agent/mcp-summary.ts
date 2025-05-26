
/**
 * MCP summary utilities for enhanced system prompts
 */

export interface MCPSummary {
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  keyParameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  sampleUseCases: string[];
  endpoint: string;
  default_key: string;
}

/**
 * Creates a condensed summary of MCP metadata for system prompts
 */
export function createMCPSummary(mcp: any): MCPSummary {
  let parameters;
  try {
    parameters = typeof mcp.parameters === 'string' 
      ? JSON.parse(mcp.parameters) 
      : mcp.parameters || [];
  } catch (e) {
    console.warn('Failed to parse parameters for MCP:', mcp.id);
    parameters = [];
  }

  // Extract key parameters (first 3 most important ones)
  const keyParameters = parameters
    .slice(0, 3)
    .map((param: any) => ({
      name: param.name,
      type: param.type,
      required: param.required || false,
      description: param.description
    }));

  // Extract sample use cases (first 3)
  let sampleUseCases: string[] = [];
  if (mcp.sampleUseCases && Array.isArray(mcp.sampleUseCases)) {
    sampleUseCases = mcp.sampleUseCases.slice(0, 3);
  }

  return {
    title: mcp.title,
    description: mcp.description,
    category: mcp.category,
    tags: mcp.tags,
    keyParameters,
    sampleUseCases,
    endpoint: mcp.endpoint,
    default_key: mcp.default_key || mcp.id
  };
}

/**
 * Formats MCP summary for inclusion in system prompt
 */
export function formatMCPForPrompt(summary: MCPSummary): string {
  const parts = [`**${summary.title}** (${summary.default_key})`];
  
  // Add description
  parts.push(`Description: ${summary.description}`);
  
  // Add category and tags if available
  if (summary.category) {
    parts.push(`Category: ${summary.category}`);
  }
  
  if (summary.tags && summary.tags.length > 0) {
    parts.push(`Tags: ${summary.tags.join(', ')}`);
  }
  
  // Add key parameters
  if (summary.keyParameters.length > 0) {
    parts.push('Key Parameters:');
    summary.keyParameters.forEach(param => {
      const requiredText = param.required ? ' (required)' : ' (optional)';
      const descText = param.description ? ` - ${param.description}` : '';
      parts.push(`  • ${param.name}: ${param.type}${requiredText}${descText}`);
    });
  }
  
  // Add sample use cases
  if (summary.sampleUseCases.length > 0) {
    parts.push('Sample Use Cases:');
    summary.sampleUseCases.forEach(useCase => {
      parts.push(`  • ${useCase}`);
    });
  }
  
  return parts.join('\n');
}
