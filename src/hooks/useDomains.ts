
import { useState, useEffect, useCallback } from 'react';
import { Domain } from '@/types/intelligence';
import { useLoopStore } from '@/store/useLoopStore';

export function useDomains() {
  const { domains, initializeFromSupabase } = useLoopStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadDomains = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await initializeFromSupabase();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch domains');
      console.error('Error fetching domains:', err);
    } finally {
      setIsLoading(false);
    }
  }, [initializeFromSupabase]);
  
  useEffect(() => {
    loadDomains();
  }, [loadDomains]);
  
  return {
    domains,
    isLoading,
    error
  };
}
