
import { useCallback } from 'react';
import { useConversationContext } from '@/contexts/ConversationContext';
import { ConversationMessage } from '@/hooks/useAgentConversation';

export const useMessagePersistence = () => {
  const { 
    loadConversation,
    persistMessage,
    addAssistantResponse
  } = useConversationContext();

  // Add a message to context and optionally persist
  const addMessage = useCallback(async (message: ConversationMessage, persist: boolean = true) => {
    console.log(`📝 Adding message via useMessagePersistence: ${message.id} (${message.role})`);
    
    if (message.role === 'assistant') {
      // Use dedicated assistant response handler
      addAssistantResponse(message);
    }
    
    if (persist) {
      return await persistMessage(message);
    }
    
    return true;
  }, [persistMessage, addAssistantResponse]);

  return {
    loadConversation,
    addMessage,
    persistMessage,
    addAssistantResponse
  };
};
