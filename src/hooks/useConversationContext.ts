
import { useState, useCallback } from 'react';
import { ConversationContext } from '@/types/tools';

export const useConversationContext = () => {
  const [context, setContext] = useState<ConversationContext>({
    toolResults: new Map()
  });

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

  const clearContext = useCallback(() => {
    setContext({
      toolResults: new Map()
    });
  }, []);

  return {
    context,
    storeToolResult,
    clearContext
  };
};
