
import { MCP } from '@/types/mcp';

/**
 * Utility functions for transforming MCP data between database and application formats
 */

export const mcpDataTransformer = {
  /**
   * Convert MCP from database format to application format
   */
  fromDatabase(dbMcp: any): MCP {
    return {
      ...dbMcp,
      parameters: typeof dbMcp.parameters === 'string' ? JSON.parse(dbMcp.parameters) : dbMcp.parameters,
      tags: typeof dbMcp.tags === 'string' ? JSON.parse(dbMcp.tags) : dbMcp.tags,
      sampleUseCases: typeof dbMcp.sampleUseCases === 'string' ? JSON.parse(dbMcp.sampleUseCases) : dbMcp.sampleUseCases
    } as MCP;
  },

  /**
   * Convert MCP from application format to database format
   */
  toDatabase(mcp: Partial<MCP>): Record<string, any> {
    const dbMcp: Record<string, any> = {};
    
    // Only include fields that are actually being updated
    if (mcp.title !== undefined) dbMcp.title = mcp.title;
    if (mcp.description !== undefined) dbMcp.description = mcp.description;
    if (mcp.endpoint !== undefined) dbMcp.endpoint = mcp.endpoint;
    if (mcp.icon !== undefined) dbMcp.icon = mcp.icon;
    if (mcp.isDefault !== undefined) dbMcp.isDefault = mcp.isDefault;
    if (mcp.category !== undefined) dbMcp.category = mcp.category;
    if (mcp.default_key !== undefined) dbMcp.default_key = mcp.default_key;
    if (mcp.requiresAuth !== undefined) dbMcp.requiresAuth = mcp.requiresAuth;
    if (mcp.authType !== undefined) dbMcp.authType = mcp.authType;
    if (mcp.authKeyName !== undefined) dbMcp.authKeyName = mcp.authKeyName;
    if (mcp.requirestoken !== undefined) dbMcp.requirestoken = mcp.requirestoken;
    if (mcp.user_id !== undefined) dbMcp.user_id = mcp.user_id;
    
    // Convert objects to JSON strings
    if (mcp.parameters !== undefined) dbMcp.parameters = JSON.stringify(mcp.parameters);
    if (mcp.tags !== undefined) dbMcp.tags = JSON.stringify(mcp.tags);
    if (mcp.sampleUseCases !== undefined) dbMcp.sampleUseCases = JSON.stringify(mcp.sampleUseCases);
    
    return dbMcp;
  },

  /**
   * Convert MCP for database creation
   */
  forCreation(mcp: Partial<MCP>): Record<string, any> {
    if (!mcp.title || !mcp.description || !mcp.endpoint) {
      throw new Error('Missing required fields: title, description, and endpoint are required');
    }
    
    return {
      title: mcp.title,
      description: mcp.description,
      endpoint: mcp.endpoint,
      icon: mcp.icon || 'terminal',
      parameters: JSON.stringify(mcp.parameters || []),
      tags: JSON.stringify(mcp.tags || []),
      sampleUseCases: JSON.stringify(mcp.sampleUseCases || []),
      isDefault: mcp.isDefault || false,
      category: mcp.category || null,
      default_key: mcp.default_key || null,
      requiresAuth: mcp.requiresAuth || false,
      authType: mcp.authType || null,
      authKeyName: mcp.authKeyName || null,
      requirestoken: mcp.requirestoken || null,
      user_id: mcp.user_id || null
    };
  }
};
