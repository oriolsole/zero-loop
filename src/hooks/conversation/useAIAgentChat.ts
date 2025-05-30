import { useState, useCallback } from 'react';
import { useModelSettings } from '@/hooks/useModelSettings';
import { useAgentConversation } from '@/hooks/useAgentConversation';
import { Agent } from '@/services/agentService';

export const useAIAgentChat = () => {
  const modelSettings = useModelSettings();
  const [isTyping, setIsTyping] = useState(false);

  const {
    currentAgent,
    setCurrentAgent,
    loopEnabled,
    setLoopEnabled,
    processMessage: originalProcessMessage
  } = useAgentConversation();

  const handleToggleLoop = useCallback((enabled: boolean) => {
    setLoopEnabled(enabled);
  }, [setLoopEnabled]);

  const handleAgentChange = useCallback((agent: Agent) => {
    setCurrentAgent(agent);
  }, [setCurrentAgent]);

  const processMessage = useCallback(async (message: string, existingMessageId?: string) => {
    setIsTyping(true);
    try {
      await originalProcessMessage(message, existingMessageId);
    } finally {
      setIsTyping(false);
    }
  }, [originalProcessMessage]);

  return {
    modelSettings,
    isTyping,
    loopEnabled,
    currentAgent,
    setCurrentAgent, // Add this to the return object
    handleToggleLoop,
    handleAgentChange,
    processMessage
  };
};
