
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ModelSettings, getModelSettings, saveModelSettings } from '@/services/modelProviderService';
import { toast } from '@/components/ui/sonner';

interface ModelSettingsContextType {
  settings: ModelSettings;
  updateSettings: (newSettings: ModelSettings) => void;
  isLoading: boolean;
  error: string | null;
  refreshSettings: () => void;
}

const ModelSettingsContext = createContext<ModelSettingsContextType | undefined>(undefined);

interface ModelSettingsProviderProps {
  children: ReactNode;
}

export const ModelSettingsProvider: React.FC<ModelSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<ModelSettings>({ provider: 'openai' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const savedSettings = getModelSettings();
      setSettings(savedSettings);
    } catch (err) {
      console.error('Error loading model settings:', err);
      setError('Failed to load model settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (newSettings: ModelSettings) => {
    try {
      saveModelSettings(newSettings);
      setSettings(newSettings);
      
      // Notify about the change
      toast.success(`Model provider updated to ${newSettings.provider}`);
      
      // Dispatch custom event for other components to listen
      window.dispatchEvent(new CustomEvent('modelSettingsChanged', { 
        detail: newSettings 
      }));
    } catch (err) {
      console.error('Error saving model settings:', err);
      setError('Failed to save model settings');
      toast.error('Failed to update model settings');
    }
  };

  const refreshSettings = () => {
    loadSettings();
  };

  useEffect(() => {
    loadSettings();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'modelSettings') {
        loadSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <ModelSettingsContext.Provider value={{
      settings,
      updateSettings,
      isLoading,
      error,
      refreshSettings
    }}>
      {children}
    </ModelSettingsContext.Provider>
  );
};

export const useModelSettings = (): ModelSettingsContextType => {
  const context = useContext(ModelSettingsContext);
  if (!context) {
    throw new Error('useModelSettings must be used within a ModelSettingsProvider');
  }
  return context;
};
