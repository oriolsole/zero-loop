
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ExternalSource, KnowledgeQueryOptions } from './types';

/**
 * Hook for querying the knowledge base with enhanced search capabilities
 */
export function useKnowledgeQuery() {
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [recentResults, setRecentResults] = useState<ExternalSource[]>([]);
  const [searchMode, setSearchMode] = useState<'semantic' | 'text'>('semantic');
  const [searchMetadata, setSearchMetadata] = useState<any>(null);
  
  /**
   * Query the knowledge base with progressive search and better fallbacks
   */
  const queryKnowledgeBase = async (options: KnowledgeQueryOptions): Promise<ExternalSource[]> => {
    setIsQuerying(true);
    setQueryError(null);
    setSearchMetadata(null);
    
    try {
      const queryParams = {
        query: options.query.trim(),
        limit: options.limit || 5,
        useEmbeddings: options.useEmbeddings !== false,
        matchThreshold: options.matchThreshold || 0.2, // Lowered default threshold
        includeNodes: options.includeNodes || false
      };

      console.log('Knowledge base query params:', queryParams);

      const { data, error } = await supabase.functions.invoke('query-knowledge-base', {
        body: queryParams
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
      
      // Set search metadata for debugging
      setSearchMetadata({
        query: queryParams.query,
        threshold: queryParams.matchThreshold,
        resultsFound: results.length,
        searchMode: queryParams.useEmbeddings ? 'semantic' : 'text',
        timestamp: new Date().toISOString()
      });
      
      setRecentResults(results);
      setSearchMode(queryParams.useEmbeddings ? 'semantic' : 'text');
      
      if (results.length === 0) {
        console.log('No results found, you may want to try a different search term or lower the threshold');
        toast.info('No results found. Try rephrasing your search or using different keywords.');
      } else {
        console.log(`Found ${results.length} results`);
      }
      
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
  
  /**
   * Repair missing embeddings by calling the repair function
   */
  const repairEmbeddings = async (): Promise<{ success: boolean; processed: number; errors: number }> => {
    try {
      toast.info('Starting embedding repair process...');
      
      const { data, error } = await supabase.functions.invoke('repair-embeddings');
      
      if (error) {
        console.error('Error repairing embeddings:', error);
        toast.error('Failed to repair embeddings');
        return { success: false, processed: 0, errors: 0 };
      }
      
      if (data.success) {
        toast.success(`Repaired embeddings for ${data.processed} chunks`);
        return { 
          success: true, 
          processed: data.processed || 0, 
          errors: data.errors || 0 
        };
      } else {
        toast.error('Embedding repair failed: ' + data.error);
        return { success: false, processed: 0, errors: 0 };
      }
    } catch (error) {
      console.error('Exception when repairing embeddings:', error);
      toast.error('Failed to repair embeddings');
      return { success: false, processed: 0, errors: 0 };
    }
  };
  
  return {
    queryKnowledgeBase,
    repairEmbeddings,
    isQuerying,
    queryError,
    recentResults,
    searchMode,
    searchMetadata
  };
}
