
import { MCPConfiguration, MCPToolConfig } from '@/types/mcpConfig';

/**
 * Utilities for validating MCP configuration files
 */
export class MCPConfigValidator {
  
  /**
   * Validate a complete MCP configuration
   */
  static validateAgentConfig(config: MCPConfiguration): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate protocol
    if (config.protocol !== 'ModelContextProtocol') {
      errors.push('Protocol must be "ModelContextProtocol"');
    }

    // Validate version
    if (!config.version || !this.isValidVersion(config.version)) {
      errors.push('Invalid or missing version');
    }

    // Validate model configuration
    if (!config.model?.name) {
      errors.push('Model name is required');
    }

    // Validate tools
    if (!config.context?.tools || !Array.isArray(config.context.tools)) {
      errors.push('Context tools must be an array');
    } else {
      config.context.tools.forEach((tool, index) => {
        const toolErrors = this.validateToolDefinition(tool);
        toolErrors.forEach(error => errors.push(`Tool ${index}: ${error}`));
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a tool configuration
   */
  static validateToolConfig(config: MCPToolConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate protocol
    if (config.protocol !== 'ModelContextProtocol') {
      errors.push('Protocol must be "ModelContextProtocol"');
    }

    // Validate version
    if (!config.version || !this.isValidVersion(config.version)) {
      errors.push('Invalid or missing version');
    }

    // Validate tool definition
    if (!config.tool) {
      errors.push('Tool definition is required');
    } else {
      const toolErrors = this.validateToolDefinition(config.tool);
      errors.push(...toolErrors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a tool definition
   */
  private static validateToolDefinition(tool: any): string[] {
    const errors: string[] = [];

    // Required fields
    if (!tool.id) errors.push('Tool ID is required');
    if (!tool.name) errors.push('Tool name is required');
    if (!tool.title) errors.push('Tool title is required');
    if (!tool.description) errors.push('Tool description is required');
    if (!tool.endpoint) errors.push('Tool endpoint is required');

    // Validate schema
    if (!tool.schema) {
      errors.push('Tool schema is required');
    } else {
      const schemaErrors = this.validateSchema(tool.schema);
      errors.push(...schemaErrors);
    }

    // Validate security if present
    if (tool.security) {
      const securityErrors = this.validateSecurity(tool.security);
      errors.push(...securityErrors);
    }

    return errors;
  }

  /**
   * Validate schema definition
   */
  private static validateSchema(schema: any): string[] {
    const errors: string[] = [];

    if (!schema.input) {
      errors.push('Input schema is required');
    } else {
      if (schema.input.type !== 'object') {
        errors.push('Input schema type must be "object"');
      }
      
      if (!schema.input.properties) {
        errors.push('Input schema properties are required');
      }
    }

    if (!schema.output) {
      errors.push('Output schema is required');
    } else {
      if (!schema.output.type) {
        errors.push('Output schema type is required');
      }
    }

    return errors;
  }

  /**
   * Validate security configuration
   */
  private static validateSecurity(security: any): string[] {
    const errors: string[] = [];

    if (security.authentication) {
      const validAuthTypes = ['api_key', 'oauth', 'basic'];
      if (!validAuthTypes.includes(security.authentication.type)) {
        errors.push(`Invalid authentication type: ${security.authentication.type}`);
      }
    }

    return errors;
  }

  /**
   * Check if version string is valid
   */
  private static isValidVersion(version: string): boolean {
    // Simple semver validation
    const semverPattern = /^\d+\.\d+\.\d+$/;
    return semverPattern.test(version);
  }

  /**
   * Get suggested fixes for common validation errors
   */
  static getSuggestedFixes(errors: string[]): string[] {
    const fixes: string[] = [];

    errors.forEach(error => {
      if (error.includes('Protocol must be')) {
        fixes.push('Set protocol field to "ModelContextProtocol"');
      }
      
      if (error.includes('version')) {
        fixes.push('Use semantic versioning format (e.g., "1.0.0")');
      }
      
      if (error.includes('Tool ID is required')) {
        fixes.push('Add a unique identifier for the tool');
      }
      
      if (error.includes('endpoint')) {
        fixes.push('Specify the edge function or API endpoint name');
      }
    });

    return fixes;
  }
}
