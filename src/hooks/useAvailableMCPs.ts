
import { useState, useEffect } from 'react';
import { mcpService } from '@/services/mcpService';
import { MCP } from '@/types/mcp';
import { toast } from '@/components/ui/sonner';

export const useAvailableMCPs = () => {
  const [mcps, setMcps] = useState<MCP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMCPs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allMCPs = await mcpService.fetchMCPs();
      setMcps(allMCPs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tools';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMCPs();
  }, []);

  return {
    mcps,
    isLoading,
    error,
    refetch: loadMCPs
  };
};
