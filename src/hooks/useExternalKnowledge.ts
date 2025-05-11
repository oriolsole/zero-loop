
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalSource } from '@/types/intelligence';
import { toast } from '@/components/ui/sonner';

interface SearchResponse {
  results: ExternalSource[];
  error?: string;
}

/**
 * Hook for accessing external knowledge via Google Search
 */
export function useExternalKnowledge() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentSources, setRecentSources] = useState<ExternalSource[]>([]);
  
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
   * Enrich a text with information from web search
   */
  const enrichWithKnowledge = async (
    text: string, 
    maxResults: number = 3
  ): Promise<{enrichedText: string, sources: ExternalSource[]}> => {
    try {
      // Search for relevant information
      const results = await searchWeb(text, maxResults);
      
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
   * Verify a claim or fact using web search
   */
  const verifyWithKnowledge = async (
    claim: string,
    maxResults: number = 3
  ): Promise<{isVerified: boolean, confidence: number, sources: ExternalSource[]}> => {
    try {
      // Search with "fact check" prefix to get verification information
      const results = await searchWeb(`fact check: ${claim}`, maxResults);
      
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
    enrichWithKnowledge,
    verifyWithKnowledge,
    isSearching,
    searchError,
    recentSources
  };
}

export type { ExternalSource };
