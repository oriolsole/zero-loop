
import { useState, useEffect } from 'react';

interface SystemPromptState {
  customPrompt: string;
  useCustomPrompt: boolean;
}

const STORAGE_KEY = 'aiAgentSystemPrompt';

export const useSystemPrompt = () => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SystemPromptState = JSON.parse(saved);
        setCustomPrompt(parsed.customPrompt || '');
        setUseCustomPrompt(parsed.useCustomPrompt || false);
      }
    } catch (error) {
      console.warn('Failed to load system prompt settings:', error);
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      const state: SystemPromptState = {
        customPrompt,
        useCustomPrompt
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save system prompt settings:', error);
    }
  }, [customPrompt, useCustomPrompt]);

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
