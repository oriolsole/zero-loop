
import { useState, useEffect } from 'react';
import { Agent } from '@/services/agentService';

interface SystemPromptState {
  customPrompt: string;
  useCustomPrompt: boolean;
}

export const useSystemPrompt = (currentAgent?: Agent | null) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);

  // Initialize from agent data when agent changes
  useEffect(() => {
    if (currentAgent) {
      const hasCustomPrompt = !!(currentAgent.system_prompt && currentAgent.system_prompt.trim());
      setCustomPrompt(currentAgent.system_prompt || '');
      setUseCustomPrompt(hasCustomPrompt);
    } else {
      // Reset when no agent
      setCustomPrompt('');
      setUseCustomPrompt(false);
    }
  }, [currentAgent]);

  const resetToDefault = () => {
    setCustomPrompt('');
    setUseCustomPrompt(false);
  };

  return {
    customPrompt,
    useCustomPrompt,
    setCustomPrompt,
    setUseCustomPrompt,
    resetToDefault
  };
};
