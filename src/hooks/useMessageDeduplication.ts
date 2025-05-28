
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

  // Create a safe hash for message deduplication (avoiding btoa unicode issues)
  const createMessageHash = useCallback((message: ConversationMessage): string => {
    const content = message.content.substring(0, 200); // Use first 200 chars for hash
    const key = `${message.role}-${content}-${message.messageType || 'none'}-${message.loopIteration || 0}`;
    
    // Use a simple hash function instead of btoa to avoid unicode issues
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36).substring(0, 32);
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
      console.log(`✅ Processing new message: ${hash}`);
      return true;
    }

    // Check if it's a recent duplicate (within 10 seconds)
    const timeDiff = message.timestamp.getTime() - existing.timestamp;
    if (timeDiff < 10000) {
      console.log(`❌ Skipping duplicate message: ${hash} (${timeDiff}ms ago)`);
      return false;
    }

    // Update timestamp for older message
    existing.timestamp = message.timestamp.getTime();
    console.log(`✅ Processing older message: ${hash}`);
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

  // Clear all processed messages (for session changes)
  const clearProcessedMessages = useCallback((): void => {
    console.log('🧹 Clearing message deduplication state for new session');
    processedMessages.current.clear();
    requestsInProgress.current.clear();
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
      console.log('🧹 Cleaned up old processed messages');
    }
  }, []);

  return {
    shouldProcessMessage,
    isRequestInProgress,
    markRequestInProgress,
    markRequestCompleted,
    clearProcessedMessages,
    cleanupProcessedMessages
  };
};
