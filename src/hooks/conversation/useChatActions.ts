
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { useConversationContext } from '@/contexts/ConversationContext';
import { useMessageManager } from '@/hooks/conversation/useMessageManager';
import { useAuth } from '@/contexts/AuthContext';

export const useChatActions = (processMessage: (message: string, existingMessageId?: string) => Promise<void>) => {
  const { user } = useAuth();
  const {
    currentSessionId,
    isLoading,
    input,
    setInput,
    addMessage,
    persistMessage
  } = useConversationContext();

  const { generateMessageId } = useMessageManager();

  const handleFollowUpAction = async (action: string) => {
    if (!user || !currentSessionId) return;

    const messageId = generateMessageId(action, 'user', currentSessionId);
    
    const followUpMessage: ConversationMessage = {
      id: messageId,
      role: 'user',
      content: action,
      timestamp: new Date()
    };

    console.log(`📤 Processing follow-up action: ${messageId}`);
    
    addMessage(followUpMessage);
    await persistMessage(followUpMessage);
    
    setInput('');
    await processMessage(action, messageId);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user || !currentSessionId) {
      return;
    }

    const messageId = generateMessageId(input, 'user', currentSessionId);

    const userMessage: ConversationMessage = {
      id: messageId,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    console.log(`📤 Sending user message: ${messageId}`);

    addMessage(userMessage);
    await persistMessage(userMessage);
    
    const messageToProcess = input;
    setInput('');
    
    await processMessage(messageToProcess, messageId);
  };

  return {
    handleFollowUpAction,
    sendMessage
  };
};
