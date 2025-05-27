
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ExternalSource, KnowledgeQueryOptions } from './types';

/**
 * Hook for querying the knowledge base with simplified approach
 */
export function useKnowledgeQuery() {
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [recentResults, setRecentResults] = useState<ExternalSource[]>([]);
  const [searchMode, setSearchMode] = useState<'semantic' | 'text'>('semantic');
  
  /**
   * Query the knowledge base - simplified to just pass the query through
   */
  const queryKnowledgeBase = async (options: KnowledgeQueryOptions): Promise<ExternalSource[]> => {
    setIsQuerying(true);
    setQueryError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('query-knowledge-base', {
        body: {
          query: options.query.trim(), // Just trim whitespace, nothing else
          limit: options.limit || 5,
          useEmbeddings: options.useEmbeddings !== false,
          matchThreshold: options.matchThreshold || 0.3,
          includeNodes: options.includeNodes || false
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
      console.log(`Found ${results.length} results`);
      
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
