import { useRef, useCallback } from 'react';
import { ConversationMessage } from './useAgentConversation';

interface MessageHash {
  contentHash: string;
  timestamp: number;
  messageType?: string;
  loopIteration?: number;
}

export const useMessageDeduplication = () => {
  const processedMessages = useRef<Map<string, MessageHash>>(new Map());
  const requestsInProgress = useRef<Set<string>>(new Set());

  // Create a hash for message deduplication
  const createMessageHash = useCallback((message: ConversationMessage): string => {
    const content = message.content.substring(0, 200); // Use first 200 chars for hash
    const key = `${message.role}-${content}-${message.messageType || 'none'}-${message.loopIteration || 0}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }, []);

  // Check if message should be processed
  const shouldProcessMessage = useCallback((message: ConversationMessage): boolean => {
    const hash = createMessageHash(message);
    const existing = processedMessages.current.get(hash);
    
    if (!existing) {
      // New message, mark as processed
      processedMessages.current.set(hash, {
        contentHash: hash,
        timestamp: message.timestamp.getTime(),
        messageType: message.messageType,
        loopIteration: message.loopIteration
      });
      return true;
    }

    // Check if it's a recent duplicate (within 10 seconds)
    const timeDiff = message.timestamp.getTime() - existing.timestamp;
    if (timeDiff < 10000) {
      console.log(`Skipping duplicate message: ${hash}`);
      return false;
    }

    // Update timestamp for older message
    existing.timestamp = message.timestamp.getTime();
    return true;
  }, [createMessageHash]);

  // Check if request is already in progress
  const isRequestInProgress = useCallback((requestKey: string): boolean => {
    return requestsInProgress.current.has(requestKey);
  }, []);

  // Mark request as in progress
  const markRequestInProgress = useCallback((requestKey: string): void => {
    requestsInProgress.current.add(requestKey);
  }, []);

  // Mark request as completed
  const markRequestCompleted = useCallback((requestKey: string): void => {
    requestsInProgress.current.delete(requestKey);
  }, []);

  // Clean up old processed messages (keep only last 100)
  const cleanupProcessedMessages = useCallback((): void => {
    if (processedMessages.current.size > 100) {
      const sortedEntries = Array.from(processedMessages.current.entries())
        .sort(([, a], [, b]) => b.timestamp - a.timestamp);
      
      processedMessages.current.clear();
      sortedEntries.slice(0, 100).forEach(([key, value]) => {
        processedMessages.current.set(key, value);
      });
    }
  }, []);

  return {
    shouldProcessMessage,
    isRequestInProgress,
    markRequestInProgress,
    markRequestCompleted,
    cleanupProcessedMessages
  };
};
