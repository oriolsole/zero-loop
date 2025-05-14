import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalSource } from '@/types/intelligence';
import { toast } from '@/components/ui/sonner';
import { useKnowledgeBase } from '@/features/knowledge/hooks/useKnowledgeBase';

interface SearchOptions {
  useWeb?: boolean;
  useKnowledgeBase?: boolean;
  limit?: number;
}

interface SearchResponse {
  results: ExternalSource[];
  error?: string;
}

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  useWeb: true,
  useKnowledgeBase: true,
  limit: 5
};

/**
 * Hook for accessing external knowledge via Google Search and internal knowledge base
 */
export function useExternalKnowledge() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentSources, setRecentSources] = useState<ExternalSource[]>([]);
  
  // Get knowledge base methods - use the correct method name from the updated hook
  const { queryKnowledge } = useKnowledgeBase();
  
  /**
   * Search the web for information related to a query
   */
  const searchWeb = async (query: string, limit: number = 5): Promise<ExternalSource[]> => {
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('google-search', {
        body: { query, limit },
      });
      
      if (error) {
        console.error('Error searching web:', error);
        setSearchError(error.message || 'Failed to search the web');
        toast.error('Failed to access web knowledge');
        return [];
      }
      
      const response = data as SearchResponse;
      
      if (response.error) {
        setSearchError(response.error);
        toast.error('Knowledge search error: ' + response.error);
        return [];
      }
      
      const results = response.results || [];
      setRecentSources(results);
      
      return results;
    } catch (error) {
      console.error('Exception when searching web:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSearchError(errorMessage);
      toast.error('Failed to access web knowledge');
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Search for information across knowledge sources (web and/or knowledge base)
   */
  const searchKnowledge = async (
    query: string, 
    options: SearchOptions = DEFAULT_SEARCH_OPTIONS
  ): Promise<ExternalSource[]> => {
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const sources: ExternalSource[] = [];
      
      // Search knowledge base if enabled
      if (options.useKnowledgeBase !== false) {
        try {
          const kbResults = await queryKnowledge({
            query,
            limit: options.limit || 5
          });
          
          if (kbResults.length > 0) {
            sources.push(...kbResults.map(result => ({
              ...result,
              source: `Knowledge Base: ${result.source}`
            })));
          }
        } catch (error) {
          console.warn('Knowledge base search failed:', error);
          // Continue with web search even if KB search fails
        }
      }
      
      // Search web if enabled and if we need more results
      if (options.useWeb !== false && 
          (sources.length < (options.limit || 5) || !options.useKnowledgeBase)) {
        try {
          const remainingLimit = options.limit 
            ? Math.max(1, options.limit - sources.length)
            : 5;
            
          const webResults = await searchWeb(query, remainingLimit);
          
          if (webResults.length > 0) {
            sources.push(...webResults);
          }
        } catch (error) {
          console.warn('Web search failed:', error);
          // Continue with what we have from knowledge base
        }
      }
      
      setRecentSources(sources);
      return sources;
    } catch (error) {
      console.error('Error searching knowledge sources:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSearchError(errorMessage);
      toast.error('Failed to search knowledge');
      return [];
    } finally {
      setIsSearching(false);
    }
  };
  
  /**
   * Enrich a text with information from knowledge sources
   */
  const enrichWithKnowledge = async (
    text: string, 
    options: SearchOptions = DEFAULT_SEARCH_OPTIONS
  ): Promise<{enrichedText: string, sources: ExternalSource[]}> => {
    try {
      // Search for relevant information
      const results = await searchKnowledge(text, options);
      
      if (results.length === 0) {
        return { enrichedText: text, sources: [] };
      }
      
      // Extract key information from search results
      const relevantInfo = results.map(result => 
        `[${result.source}] ${result.snippet}`
      ).join('\n\n');
      
      // Simplified enrichment (in a real system, this would use an LLM to combine the info)
      const enrichedText = `${text}\n\nAdditional context:\n${relevantInfo}`;
      
      return {
        enrichedText,
        sources: results
      };
    } catch (error) {
      console.error('Error enriching text with knowledge:', error);
      toast.error('Failed to enrich with external knowledge');
      return { enrichedText: text, sources: [] };
    }
  };
  
  /**
   * Verify a claim or fact using knowledge sources
   */
  const verifyWithKnowledge = async (
    claim: string,
    options: SearchOptions = DEFAULT_SEARCH_OPTIONS
  ): Promise<{isVerified: boolean, confidence: number, sources: ExternalSource[]}> => {
    try {
      // Search with "fact check" prefix to get verification information
      const results = await searchKnowledge(`fact check: ${claim}`, options);
      
      if (results.length === 0) {
        return { isVerified: false, confidence: 0, sources: [] };
      }
      
      // Simple verification heuristic based on keywords
      let verificationScore = 0.5; // Default neutral confidence
      const verificationTexts = results.map(r => r.snippet.toLowerCase());
      
      const positiveWords = ['confirmed', 'verified', 'true', 'accurate', 'correct'];
      const negativeWords = ['false', 'incorrect', 'misleading', 'wrong', 'debunked'];
      
      // Adjust score based on occurrences of positive or negative indicators
      verificationTexts.forEach(text => {
        positiveWords.forEach(word => {
          if (text.includes(word)) verificationScore += 0.1;
        });
        
        negativeWords.forEach(word => {
          if (text.includes(word)) verificationScore -= 0.15;
        });
      });
      
      // Clamp the score between 0 and 1
      verificationScore = Math.max(0, Math.min(1, verificationScore));
      
      return {
        isVerified: verificationScore >= 0.6,
        confidence: verificationScore,
        sources: results
      };
    } catch (error) {
      console.error('Error verifying with knowledge:', error);
      return { isVerified: false, confidence: 0, sources: [] };
    }
  };
  
  return {
    searchWeb,
    searchKnowledge,
    enrichWithKnowledge,
    verifyWithKnowledge,
    isSearching,
    searchError,
    recentSources
  };
}

export type { ExternalSource, SearchOptions };
