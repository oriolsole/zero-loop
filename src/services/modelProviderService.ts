
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
  category?: string;
  description?: string;
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
 * Get available OpenAI models with categories and descriptions
 */
export function getOpenAIModels(): ProviderModel[] {
  return [
    // GPT-4 Series - Highest Quality
    { 
      id: 'gpt-4.5', 
      name: 'GPT-4.5', 
      provider: 'openai', 
      category: 'Premium',
      description: 'Highest accuracy and reasoning - ideal for complex analysis'
    },
    { 
      id: 'gpt-4.1', 
      name: 'GPT-4.1', 
      provider: 'openai', 
      category: 'Premium',
      description: 'Improved coding performance with 1M token context window'
    },
    { 
      id: 'gpt-4.1-mini', 
      name: 'GPT-4.1 Mini', 
      provider: 'openai', 
      category: 'Premium',
      description: '40% cost reduction while maintaining strong capability'
    },
    { 
      id: 'gpt-4.1-nano', 
      name: 'GPT-4.1 Nano', 
      provider: 'openai', 
      category: 'Premium',
      description: 'Fastest and cheapest for high-volume calls'
    },
    { 
      id: 'gpt-4o', 
      name: 'GPT-4O', 
      provider: 'openai', 
      category: 'Multimodal',
      description: 'True multimodal support - handles text, images, and audio'
    },

    // O-Series Reasoning Models
    { 
      id: 'o1', 
      name: 'O1', 
      provider: 'openai', 
      category: 'Reasoning',
      description: 'Advanced chain-of-thought reasoning for complex problems'
    },
    { 
      id: 'o1-mini', 
      name: 'O1 Mini', 
      provider: 'openai', 
      category: 'Reasoning',
      description: 'Compact reasoning model with faster response times'
    },
    { 
      id: 'o1-pro', 
      name: 'O1 Pro', 
      provider: 'openai', 
      category: 'Reasoning',
      description: 'Most advanced reasoning capabilities for expert-level tasks'
    },
    { 
      id: 'o3', 
      name: 'O3', 
      provider: 'openai', 
      category: 'Reasoning',
      description: 'Enhanced reflection for multi-step problem solving'
    },
    { 
      id: 'o3-mini', 
      name: 'O3 Mini', 
      provider: 'openai', 
      category: 'Reasoning',
      description: 'Compact version of O3 with efficient reasoning'
    },
    { 
      id: 'o4-mini', 
      name: 'O4 Mini', 
      provider: 'openai', 
      category: 'Reasoning',
      description: 'O3 reasoning plus image analysis capabilities'
    },

    // GPT-3.5 Series - Fast & Economical
    { 
      id: 'gpt-3.5-turbo', 
      name: 'GPT-3.5 Turbo', 
      provider: 'openai', 
      category: 'Standard',
      description: 'Fast and economical for conversational tasks'
    },
    { 
      id: 'gpt-3.5-turbo-16k', 
      name: 'GPT-3.5 Turbo 16K', 
      provider: 'openai', 
      category: 'Standard',
      description: 'Extended context window for longer documents'
    },

    // GPT-3 Instruct Models
    { 
      id: 'text-davinci-003', 
      name: 'Text Davinci 003', 
      provider: 'openai', 
      category: 'Instruct',
      description: 'Best for instruction following and creative writing'
    },

    // Specialized Models
    { 
      id: 'code-davinci-002', 
      name: 'Code Davinci 002', 
      provider: 'openai', 
      category: 'Code',
      description: 'Specialized for code generation and programming tasks'
    },

    // Legacy models for backward compatibility
    { 
      id: 'gpt-4o-mini', 
      name: 'GPT-4O Mini (Legacy)', 
      provider: 'openai', 
      category: 'Legacy',
      description: 'Previous generation fast model'
    }
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

/**
 * Model provider service object
 */
export const modelProviderService = {
  getSettings: getModelSettings,
  saveSettings: saveModelSettings,
  getNpawModels,
  getOpenAIModels,
  isLocalUrl
};
