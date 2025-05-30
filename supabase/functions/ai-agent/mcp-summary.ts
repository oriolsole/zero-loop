

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
  priority?: number;
}

/**
 * Normalizes tags into an array format
 */
function normalizeTags(tags: any): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    // Handle comma-separated string
    return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  }
  return [];
}

/**
 * Creates a condensed summary of MCP metadata for system prompts
 * Now supports agent-specific custom configurations
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

  // Extract key parameters (first 2 most important ones for token efficiency)
  const keyParameters = parameters
    .slice(0, 2)
    .map((param: any) => ({
      name: param.name,
      type: param.type,
      required: param.required || false,
      description: param.description
    }));

  // Use custom use cases if available (from agent configuration), otherwise default sample use cases
  let sampleUseCases: string[] = [];
  
  // Check if this MCP has custom use cases (set by agent configuration)
  if (mcp.sampleUseCases && Array.isArray(mcp.sampleUseCases)) {
    sampleUseCases = mcp.sampleUseCases.slice(0, 3); // Limit to 3 for token efficiency
  }

  return {
    title: mcp.title, // This now includes custom title if set
    description: mcp.description, // This now includes custom description if set
    category: mcp.category,
    tags: normalizeTags(mcp.tags),
    keyParameters,
    sampleUseCases,
    endpoint: mcp.endpoint,
    default_key: mcp.default_key || mcp.id,
    priority: mcp.priority || 1 // This now includes custom priority if set
  };
}

/**
 * Formats MCP summary for inclusion in system prompt with enhanced custom configuration support
 */
export function formatMCPForPrompt(summary: MCPSummary): string {
  // Compact inline format: **ToolName** (category) — description
  const categoryText = summary.category ? ` (${summary.category})` : '';
  let result = `**${summary.title}**${categoryText} — ${summary.description}`;
  
  // Add parameters in compact format
  if (summary.keyParameters.length > 0) {
    const paramsList = summary.keyParameters.map(param => {
      const requiredText = param.required ? ', required' : '';
      return `${param.name} (${param.type}${requiredText})`;
    }).join(', ');
    result += `\n• Parameters: ${paramsList}`;
  }
  
  // Add use cases with emphasis on custom configurations
  if (summary.sampleUseCases.length > 0) {
    result += `\n• Use cases: ${summary.sampleUseCases.join('; ')}`;
  }
  
  return result;
}

