
/**
 * Service for managing different AI model providers (OpenAI, Local, NPAW)
 */

export type ModelProvider = 'openai' | 'local' | 'npaw';

export interface ModelSettings {
  provider: ModelProvider;
  localModelUrl?: string;
  selectedModel?: string;
}

export interface ProviderModel {
  id: string;
  name: string;
  provider: ModelProvider;
}

/**
 * Get the stored model settings from local storage
 */
export function getModelSettings(): ModelSettings {
  try {
    const settings = localStorage.getItem('modelSettings');
    if (settings) {
      return JSON.parse(settings);
    }
  } catch (error) {
    console.error('Error reading model settings:', error);
  }
  
  return { provider: 'openai' };
}

/**
 * Save model settings to local storage
 */
export function saveModelSettings(settings: ModelSettings): void {
  try {
    localStorage.setItem('modelSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving model settings:', error);
  }
}

/**
 * Get available models for NPAW provider
 */
export function getNpawModels(): ProviderModel[] {
  return [
    { id: 'DeepSeek-V3', name: 'DeepSeek-V3', provider: 'npaw' },
    { id: 'Mistral7B', name: 'Mistral7B', provider: 'npaw' }
  ];
}

/**
 * Get available OpenAI models
 */
export function getOpenAIModels(): ProviderModel[] {
  return [
    { id: 'gpt-4o', name: 'GPT-4O', provider: 'openai' },
    { id: 'gpt-4o-mini', name: 'GPT-4O Mini', provider: 'openai' }
  ];
}

/**
 * Check if a URL is a localhost URL
 */
export function isLocalUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname === 'localhost' || 
      parsedUrl.hostname === '127.0.0.1' ||
      parsedUrl.hostname.startsWith('192.168.') ||
      parsedUrl.hostname.startsWith('10.')
    );
  } catch {
    return false;
  }
}
