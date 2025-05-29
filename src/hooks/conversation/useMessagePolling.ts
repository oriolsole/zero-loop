
import { useEffect, useRef, useCallback } from 'react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { useMessageManager } from './useMessageManager';

interface UseMessagePollingProps {
  sessionId: string | null;
  isLoading: boolean;
  onMessagesReceived: (messages: ConversationMessage[]) => void;
  currentMessageCount: number;
}

export const useMessagePolling = ({
  sessionId,
  isLoading,
  onMessagesReceived,
  currentMessageCount
}: UseMessagePollingProps) => {
  const { loadConversationFromDatabase } = useMessageManager();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(currentMessageCount);

  const pollMessages = useCallback(async () => {
    if (!sessionId) return;

    try {
      console.log(`🔄 [POLLING] Checking for new messages in session: ${sessionId}`);
      const messages = await loadConversationFromDatabase(sessionId);
      
      // Only update if we have new messages
      if (messages.length > lastMessageCountRef.current) {
        console.log(`📥 [POLLING] Found ${messages.length - lastMessageCountRef.current} new messages`);
        onMessagesReceived(messages);
        lastMessageCountRef.current = messages.length;
      }
    } catch (error) {
      console.error('❌ [POLLING] Error polling messages:', error);
    }
  }, [sessionId, loadConversationFromDatabase, onMessagesReceived]);

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

  // Update message count reference when current count changes
  useEffect(() => {
    lastMessageCountRef.current = currentMessageCount;
  }, [currentMessageCount]);

  return { pollMessages };
};
