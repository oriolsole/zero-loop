
import { useState, useCallback } from 'react';
import { ConversationContext } from '@/types/tools';

export const useConversationContext = () => {
  const [context, setContext] = useState<ConversationContext>({
    toolResults: new Map()
  });

  const updateGitHubContext = useCallback((repoData: { owner: string; repo: string; url: string }) => {
    setContext(prev => ({
      ...prev,
      lastGitHubRepo: {
        ...repoData,
        analyzedAt: new Date()
      }
    }));
  }, []);

  const updateSearchContext = useCallback((query: string, results: any[]) => {
    setContext(prev => ({
      ...prev,
      lastSearchQuery: {
        query,
        results,
        searchedAt: new Date()
      }
    }));
  }, []);

  const storeToolResult = useCallback((toolId: string, result: any) => {
    setContext(prev => {
      const newToolResults = new Map(prev.toolResults);
      newToolResults.set(toolId, result);
      return {
        ...prev,
        toolResults: newToolResults
      };
    });
  }, []);

  // Simplified context retrieval - no automatic pattern matching
  const getContextForMessage = useCallback((message: string): string => {
    // Return empty string - let the LLM decide when context is needed via tools
    return '';
  }, [context]);

  return {
    context,
    updateGitHubContext,
    updateSearchContext,
    storeToolResult,
    getContextForMessage
  };
};
