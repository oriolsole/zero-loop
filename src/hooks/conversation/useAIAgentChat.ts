
import { useState, useCallback } from 'react';
import { useAgentConversation } from '@/hooks/useAgentConversation';
import { useAgentManagement } from '@/hooks/useAgentManagement';
import { ModelProvider } from '@/services/modelProviderService';

export const useAIAgentChat = () => {
  const [isTyping, setIsTyping] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);

  // Get agent management functionality
  const { currentAgent, setCurrentAgent } = useAgentManagement();

  // Get conversation functionality
  const { addMessage } = useAgentConversation();

  // Create mock model settings since the hook doesn't exist
  const modelSettings = {
    provider: 'openai' as ModelProvider,
    selectedModel: currentAgent?.model || 'gpt-4o'
  };

  const handleToggleLoop = useCallback((enabled: boolean) => {
    setLoopEnabled(enabled);
  }, []);

  const handleAgentChange = useCallback((agent: any) => {
    setCurrentAgent(agent);
  }, [setCurrentAgent]);

  const processMessage = useCallback(async (message: string, existingMessageId?: string) => {
    setIsTyping(true);
    try {
      // Create a basic message object and add it
      const messageObj = {
        id: existingMessageId || `msg-${Date.now()}`,
        role: 'user' as const,
        content: message,
        timestamp: new Date()
      };
      await addMessage(messageObj);
    } finally {
      setIsTyping(false);
    }
  }, [addMessage]);

  return {
    modelSettings,
    isTyping,
    loopEnabled,
    currentAgent,
    setCurrentAgent,
    handleToggleLoop,
    handleAgentChange,
    processMessage
  };
};
