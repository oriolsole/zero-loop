
import { supabase } from '@/integrations/supabase/client';

export interface CredentialValidationResult {
  valid: boolean;
  service: string;
  error?: string;
  details?: any;
}

class MCPCredentialService {
  private validationCache = new Map<string, { result: CredentialValidationResult; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async validateCredentials(mcpEndpoint: string, requiresToken?: string): Promise<CredentialValidationResult> {
    const cacheKey = `${mcpEndpoint}-${requiresToken || 'none'}`;
    
    // Check cache first
    const cached = this.validationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`🎯 Using cached validation result for ${mcpEndpoint}`);
      return cached.result;
    }

    try {
      console.log(`🔍 Validating credentials for ${mcpEndpoint}...`);
      
      const { data, error } = await supabase.functions.invoke('validate-mcp-credentials', {
        body: { mcpEndpoint, requiresToken }
      });

      if (error) {
        console.error('❌ Credential validation error:', error);
        return {
          valid: false,
          service: mcpEndpoint,
          error: error.message || 'Validation failed'
        };
      }

      const result = data as CredentialValidationResult;
      
      // Cache the result
      this.validationCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      console.log(`✅ Validation result for ${mcpEndpoint}:`, result);
      return result;

    } catch (error) {
      console.error('❌ Credential validation failed:', error);
      return {
        valid: false,
        service: mcpEndpoint,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  clearCache(mcpEndpoint?: string) {
    if (mcpEndpoint) {
      // Clear specific endpoint cache
      for (const key of this.validationCache.keys()) {
        if (key.startsWith(mcpEndpoint)) {
          this.validationCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.validationCache.clear();
    }
  }

  async forceRevalidate(mcpEndpoint: string, requiresToken?: string): Promise<CredentialValidationResult> {
    this.clearCache(mcpEndpoint);
    return this.validateCredentials(mcpEndpoint, requiresToken);
  }
}

export const mcpCredentialService = new MCPCredentialService();
