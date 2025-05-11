
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ExternalSource } from '@/types/intelligence';

interface KnowledgeUploadOptions {
  title: string;
  content: string;
  metadata?: Record<string, any>;
  domainId?: string;
  sourceUrl?: string;
  chunkSize?: number;
  overlap?: number;
}

interface KnowledgeQueryOptions {
  query: string;
  limit?: number;
  useEmbeddings?: boolean;
}

/**
 * Hook for accessing and managing the knowledge base
 */
export function useKnowledgeBase() {
  const [isUploading, setIsUploading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [recentResults, setRecentResults] = useState<ExternalSource[]>([]);
  
  /**
   * Upload knowledge to the knowledge base
   */
  const uploadKnowledge = async (options: KnowledgeUploadOptions): Promise<boolean> => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('upload-knowledge', {
        body: {
          title: options.title,
          content: options.content,
          metadata: options.metadata || {},
          domain_id: options.domainId,
          source_url: options.sourceUrl,
          chunk_size: options.chunkSize || 1000,
          overlap: options.overlap || 100
        }
      });
      
      if (error) {
        console.error('Error uploading knowledge:', error);
        setUploadError(error.message || 'Failed to upload knowledge');
        toast.error('Failed to upload knowledge');
        return false;
      }
      
      if (!data.success) {
        setUploadError(data.error || 'Failed to upload knowledge');
        toast.error(data.error || 'Failed to upload knowledge');
        return false;
      }
      
      toast.success('Knowledge uploaded successfully');
      return true;
    } catch (error) {
      console.error('Exception when uploading knowledge:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadError(errorMessage);
      toast.error('Failed to upload knowledge');
      return false;
    } finally {
      setIsUploading(false);
    }
  };
  
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
          useEmbeddings: options.useEmbeddings !== false
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
   * Enrich a text with information from knowledge base
   */
  const enrichWithKnowledge = async (
    text: string, 
    maxResults: number = 3
  ): Promise<{enrichedText: string, sources: ExternalSource[]}> => {
    try {
      // Query for relevant information
      const results = await queryKnowledgeBase({
        query: text,
        limit: maxResults
      });
      
      if (results.length === 0) {
        return { enrichedText: text, sources: [] };
      }
      
      // Extract key information from knowledge base results
      const relevantInfo = results.map(result => 
        `[${result.source}] ${result.snippet}`
      ).join('\n\n');
      
      // Simplified enrichment (in a real system, this would use an LLM to combine the info)
      const enrichedText = `${text}\n\nAdditional context from knowledge base:\n${relevantInfo}`;
      
      return {
        enrichedText,
        sources: results
      };
    } catch (error) {
      console.error('Error enriching text with knowledge base:', error);
      toast.error('Failed to enrich with knowledge base');
      return { enrichedText: text, sources: [] };
    }
  };
  
  /**
   * Verify a claim or fact using knowledge base
   */
  const verifyWithKnowledge = async (
    claim: string,
    maxResults: number = 3
  ): Promise<{isVerified: boolean, confidence: number, sources: ExternalSource[]}> => {
    try {
      // Query with verification context
      const results = await queryKnowledgeBase({
        query: `verify: ${claim}`,
        limit: maxResults
      });
      
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
      console.error('Error verifying with knowledge base:', error);
      return { isVerified: false, confidence: 0, sources: [] };
    }
  };
  
  return {
    uploadKnowledge,
    queryKnowledgeBase,
    enrichWithKnowledge,
    verifyWithKnowledge,
    isUploading,
    isQuerying,
    uploadError,
    queryError,
    recentResults
  };
}

export type { ExternalSource };
