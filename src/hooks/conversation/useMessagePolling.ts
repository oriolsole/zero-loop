
import { useEffect, useRef, useCallback } from 'react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { useMessageManager } from './useMessageManager';

interface UseMessagePollingProps {
  sessionId: string | null;
  isLoading: boolean;
  onMessagesReceived: (messages: ConversationMessage[]) => void;
  lastMessageTimestamp: Date | null;
}

export const useMessagePolling = ({
  sessionId,
  isLoading,
  onMessagesReceived,
  lastMessageTimestamp
}: UseMessagePollingProps) => {
  const { loadConversationFromDatabase } = useMessageManager();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const pollMessages = useCallback(async () => {
    if (!sessionId) return;

    try {
      console.log(`🔄 [POLLING] Checking for new messages in session: ${sessionId} after ${lastMessageTimestamp?.toISOString() || 'beginning'}`);
      
      // Only fetch messages newer than the last displayed message
      const messages = await loadConversationFromDatabase(sessionId, lastMessageTimestamp || undefined);
      
      // Only update if we have new messages
      if (messages.length > 0) {
        console.log(`📥 [POLLING] Found ${messages.length} new messages`);
        onMessagesReceived(messages);
      }
    } catch (error) {
      console.error('❌ [POLLING] Error polling messages:', error);
    }
  }, [sessionId, loadConversationFromDatabase, onMessagesReceived, lastMessageTimestamp]);

  // Start/stop polling based on loading state
  useEffect(() => {
    if (isLoading && sessionId) {
      console.log('🟢 [POLLING] Starting message polling (conversation active)');
      
      // Poll immediately, then every 2 seconds
      pollMessages();
      pollingIntervalRef.current = setInterval(pollMessages, 2000);
    } else {
      console.log('🔴 [POLLING] Stopping message polling');
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isLoading, sessionId, pollMessages]);

  return { pollMessages };
};
