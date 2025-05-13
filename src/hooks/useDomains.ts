
import { useState, useEffect } from 'react';
import { Domain } from '@/types/intelligence';
import { useLoopStore } from '@/store/useLoopStore';

export function useDomains() {
  const { domains, fetchDomains } = useLoopStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadDomains = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await fetchDomains();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch domains');
        console.error('Error fetching domains:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDomains();
  }, [fetchDomains]);
  
  return {
    domains,
    isLoading,
    error
  };
}
