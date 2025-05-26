
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ExternalSource, KnowledgeQueryOptions } from './types';

/**
 * Extracts quoted terms from a query string
 */
function extractQuotedTerms(query: string): string[] {
  const quotedMatches = query.match(/"([^"]+)"/g);
  return quotedMatches ? quotedMatches.map(match => match.replace(/"/g, '')) : [];
}

/**
 * Enhanced search term extraction from conversational queries
 */
function extractSearchTerms(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  // First, try to extract quoted terms - these are usually the most important
  const quotedTerms = extractQuotedTerms(query);
  if (quotedTerms.length > 0) {
    return quotedTerms.join(' ');
  }
  
  // Clean the query
  let cleaned = query.toLowerCase().trim();
  
  // Remove common conversational prefixes and suffixes
  const conversationalPrefixes = [
    'can you search for',
    'can you search',
    'can you find',
    'can you look for',
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
  
  const conversationalSuffixes = [
    'in our knowledge base',
    'in the knowledge base',
    'in our database',
    'in the database',
    'please',
    'thanks',
    'thank you'
  ];
  
  // Remove prefixes
  for (const prefix of conversationalPrefixes) {
    const pattern = new RegExp(`^${prefix}\\s+`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove suffixes
  for (const suffix of conversationalSuffixes) {
    const pattern = new RegExp(`\\s+${suffix}$`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove question marks and extra punctuation at the end
  cleaned = cleaned.replace(/[?!.]+$/, '').trim();
  
  // If we're left with nothing meaningful, try to extract the most important words
  if (!cleaned || cleaned.length < 2) {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'our', 'can', 'you'];
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return words.join(' ');
  }
  
  return cleaned;
}

/**
 * Cleans and preprocesses search queries to improve matching
 */
function cleanSearchQuery(query: string): string {
  if (!query) return '';
  
  // First try to extract the actual search terms
  const extractedTerms = extractSearchTerms(query);
  if (extractedTerms && extractedTerms.trim()) {
    return extractedTerms.trim();
  }
  
  // Fallback to basic cleaning
  let cleaned = query.toLowerCase().trim();
  
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
      // Extract and clean the query for better matching
      const originalQuery = options.query;
      const extractedTerms = extractSearchTerms(originalQuery);
      const cleanedQuery = cleanSearchQuery(extractedTerms || originalQuery);
      
      console.log(`Original query: "${originalQuery}"`);
      console.log(`Extracted terms: "${extractedTerms}"`);
      console.log(`Cleaned query: "${cleanedQuery}"`);
      
      // Use the best available query
      const queryToUse = cleanedQuery || extractedTerms || originalQuery;
      
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
      
      // If we got no results with processed query and it's different from original,
      // try again with the original query
      if (results.length === 0 && queryToUse !== originalQuery && originalQuery.trim()) {
        console.log(`No results with processed query, trying original: "${originalQuery}"`);
        
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
      console.log(`Found ${results.length} results with processed query`);
      
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
