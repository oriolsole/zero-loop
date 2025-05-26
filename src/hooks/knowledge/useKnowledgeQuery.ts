
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ExternalSource, KnowledgeQueryOptions } from './types';

/**
 * Cleans and preprocesses search queries to improve matching
 */
function cleanSearchQuery(query: string): string {
  if (!query) return '';
  
  let cleaned = query.toLowerCase().trim();
  
  // Remove common search prefixes that interfere with semantic matching
  const searchPrefixes = [
    'search for',
    'search',
    'find',
    'look for',
    'lookup',
    'get information about',
    'information about',
    'tell me about',
    'what is',
    'who is',
    'about'
  ];
  
  for (const prefix of searchPrefixes) {
    const pattern = new RegExp(`^${prefix}\\s+`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned.trim();
}

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
      // Clean the query for better matching
      const originalQuery = options.query;
      const cleanedQuery = cleanSearchQuery(originalQuery);
      console.log(`Original query: "${originalQuery}" -> Cleaned query: "${cleanedQuery}"`);
      
      // Use cleaned query if available, otherwise fall back to original
      const queryToUse = cleanedQuery || originalQuery;
      
      const { data, error } = await supabase.functions.invoke('query-knowledge-base', {
        body: {
          query: queryToUse,
          limit: options.limit || 5,
          useEmbeddings: options.useEmbeddings !== false,
          matchThreshold: options.matchThreshold || 0.3, // Lower default threshold
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
      
      // If we got no results with cleaned query and it's different from original,
      // try again with the original query
      if (results.length === 0 && cleanedQuery !== originalQuery && originalQuery.trim()) {
        console.log(`No results with cleaned query, trying original: "${originalQuery}"`);
        
        const { data: originalData, error: originalError } = await supabase.functions.invoke('query-knowledge-base', {
          body: {
            query: originalQuery,
            limit: options.limit || 5,
            useEmbeddings: options.useEmbeddings !== false,
            matchThreshold: options.matchThreshold || 0.3,
            includeNodes: options.includeNodes || false
          }
        });
        
        if (!originalError && !originalData.error && originalData.results?.length > 0) {
          const originalResults = originalData.results;
          setRecentResults(originalResults);
          setSearchMode(options.useEmbeddings !== false ? 'semantic' : 'text');
          console.log(`Found ${originalResults.length} results with original query`);
          return originalResults;
        }
      }
      
      setRecentResults(results);
      setSearchMode(options.useEmbeddings !== false ? 'semantic' : 'text');
      console.log(`Found ${results.length} results with cleaned query`);
      
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
