
import { useModelSettings } from '@/contexts/ModelSettingsContext';
import { useEffect, useState } from 'react';
import { ModelSettings } from '@/services/modelProviderService';

/**
 * Hook that provides model settings with additional utilities for AI features
 */
export const useGlobalModelSettings = () => {
  const { settings, updateSettings, isLoading, error } = useModelSettings();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isLoading && settings.provider && settings.selectedModel) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [isLoading, settings]);

  const getModelForRequest = (): ModelSettings => {
    // Always return current global settings
    return settings;
  };

  const isModelConfigured = (): boolean => {
    return !!(settings.provider && settings.selectedModel);
  };

  const getProviderDisplayName = (): string => {
    switch (settings.provider) {
      case 'openai': return 'OpenAI';
      case 'npaw': return 'NPAW DeepSeek';
      case 'local': return 'Local Model';
      default: return 'Unknown';
    }
  };

  return {
    settings,
    updateSettings,
    isLoading,
    error,
    isReady,
    isModelConfigured,
    getModelForRequest,
    getProviderDisplayName
  };
};
