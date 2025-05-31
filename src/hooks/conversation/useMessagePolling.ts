
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
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const pollMessages = useCallback(async () => {
    if (!sessionId) return;

    try {
      console.log(`🔄 [POLLING] Checking for new/updated messages in session: ${sessionId} after ${lastMessageTimestamp?.toISOString() || 'beginning'}`);
      
      // Fetch messages that are either new or have been updated since the last poll
      const messages = await loadConversationFromDatabase(sessionId, lastMessageTimestamp || undefined);
      
      // Only update if we have new/updated messages
      if (messages.length > 0) {
        console.log(`📥 [POLLING] Found ${messages.length} new/updated messages`);
        onMessagesReceived(messages);
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (error) {
      console.error('❌ [POLLING] Error polling messages:', error);
      retryCountRef.current++;
      
      // Stop polling if we've had too many consecutive errors
      if (retryCountRef.current >= maxRetries) {
        console.log('🛑 [POLLING] Too many errors, stopping polling');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }
  }, [sessionId, loadConversationFromDatabase, onMessagesReceived, lastMessageTimestamp]);

  // Start/stop polling based on loading state
  useEffect(() => {
    // Only poll when we have a session and are NOT loading (to avoid infinite loops)
    if (sessionId && !isLoading) {
      console.log('🟢 [POLLING] Starting message polling (conversation idle)');
      
      // Poll immediately, then every 3 seconds (increased from 2s to reduce load)
      pollMessages();
      pollingIntervalRef.current = setInterval(pollMessages, 3000);
    } else {
      console.log('🔴 [POLLING] Stopping message polling', { 
        hasSession: !!sessionId, 
        isLoading, 
        reason: !sessionId ? 'no session' : 'loading in progress' 
      });
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Reset retry count when polling stops
      retryCountRef.current = 0;
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [sessionId, isLoading, pollMessages]);

  return { pollMessages };
};
