
import { useCallback } from 'react';
import { useConversationContext } from '@/contexts/ConversationContext';

export const useMessagePersistence = () => {
  const { 
    loadConversation,
    persistMessage
  } = useConversationContext();

  // Simple wrapper that delegates to context
  const addMessage = useCallback(async (message: any) => {
    return await persistMessage(message);
  }, [persistMessage]);

  return {
    loadConversation,
    addMessage
  };
};
