
import { ExternalSource } from './types';
import { useKnowledgeQuery } from './useKnowledgeQuery';
import { toast } from '@/components/ui/sonner';

/**
 * Hook for enriching text with knowledge base information
 */
export function useKnowledgeEnrich() {
  const { queryKnowledgeBase } = useKnowledgeQuery();
  
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
    enrichWithKnowledge,
    verifyWithKnowledge
  };
}
