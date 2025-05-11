
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  date: string | null;
}

interface SearchResponse {
  results: SearchResult[];
  error?: string;
}

/**
 * Hook for accessing external knowledge via Google Search
 */
export function useExternalKnowledge() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  /**
   * Search the web for information related to a query
   */
  const searchWeb = async (query: string, limit: number = 5): Promise<SearchResult[]> => {
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('google-search', {
        body: { query, limit },
      });
      
      if (error) {
        console.error('Error searching web:', error);
        setSearchError(error.message || 'Failed to search the web');
        return [];
      }
      
      const response = data as SearchResponse;
      
      if (response.error) {
        setSearchError(response.error);
        return [];
      }
      
      return response.results || [];
      
    } catch (error) {
      console.error('Exception when searching web:', error);
      setSearchError(error instanceof Error ? error.message : 'Unknown error occurred');
      return [];
    } finally {
      setIsSearching(false);
    }
  };
  
  /**
   * Enrich a text with information from web search
   */
  const enrichWithKnowledge = async (
    text: string, 
    maxResults: number = 3
  ): Promise<{enrichedText: string, sources: SearchResult[]}> => {
    try {
      // Search for relevant information
      const results = await searchWeb(text, maxResults);
      
      if (results.length === 0) {
        return { enrichedText: text, sources: [] };
      }
      
      // Extract key information from search results
      const relevantInfo = results.map(result => result.snippet).join('\n\n');
      
      // Simplified enrichment (in a real system, this would use an LLM to combine the info)
      const enrichedText = `${text}\n\nAdditional context:\n${relevantInfo}`;
      
      return {
        enrichedText,
        sources: results
      };
      
    } catch (error) {
      console.error('Error enriching text with knowledge:', error);
      return { enrichedText: text, sources: [] };
    }
  };
  
  return {
    searchWeb,
    enrichWithKnowledge,
    isSearching,
    searchError
  };
}
