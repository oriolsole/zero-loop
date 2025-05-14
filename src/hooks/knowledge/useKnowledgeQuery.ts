
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ExternalSource, KnowledgeQueryOptions } from './types';

/**
 * Hook for querying the knowledge base
 */
export function useKnowledgeQuery() {
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [recentResults, setRecentResults] = useState<ExternalSource[]>([]);
  const [searchMode, setSearchMode] = useState<'semantic' | 'text'>('semantic');
  
  /**
   * Query the knowledge base
   */
  const queryKnowledgeBase = async (options: KnowledgeQueryOptions): Promise<ExternalSource[]> => {
    setIsQuerying(true);
    setQueryError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('query-knowledge-base', {
        body: {
          query: options.query,
          limit: options.limit || 5,
          useEmbeddings: options.useEmbeddings !== false,
          matchThreshold: options.matchThreshold || 0.5,
          includeNodes: options.includeNodes || false // New parameter
        }
      });
      
      if (error) {
        console.error('Error querying knowledge base:', error);
        setQueryError(error.message || 'Failed to query knowledge base');
        toast.error('Failed to access knowledge base');
        return [];
      }
      
      if (data.error) {
        setQueryError(data.error);
        toast.error('Knowledge base error: ' + data.error);
        return [];
      }
      
      const results = data.results || [];
      setRecentResults(results);
      setSearchMode(options.useEmbeddings !== false ? 'semantic' : 'text');
      
      return results;
    } catch (error) {
      console.error('Exception when querying knowledge base:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setQueryError(errorMessage);
      toast.error('Failed to access knowledge base');
      return [];
    } finally {
      setIsQuerying(false);
    }
  };
  
  return {
    queryKnowledgeBase,
    isQuerying,
    queryError,
    recentResults,
    searchMode
  };
}
