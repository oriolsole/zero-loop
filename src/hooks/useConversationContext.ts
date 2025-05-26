
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

  const getContextForMessage = useCallback((message: string): string => {
    const contextParts: string[] = [];
    
    if (context.lastGitHubRepo && message.toLowerCase().includes('project')) {
      contextParts.push(`Previously analyzed GitHub repository: ${context.lastGitHubRepo.owner}/${context.lastGitHubRepo.repo}`);
    }
    
    if (context.lastSearchQuery && (message.toLowerCase().includes('search') || message.toLowerCase().includes('find'))) {
      contextParts.push(`Recent search: "${context.lastSearchQuery.query}"`);
    }

    return contextParts.join('. ');
  }, [context]);

  return {
    context,
    updateGitHubContext,
    updateSearchContext,
    storeToolResult,
    getContextForMessage
  };
};
