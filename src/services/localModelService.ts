
/**
 * Service for directly accessing local LLM models without going through edge functions
 * This allows development with localhost LLM models while edge functions are used in production
 */

interface ModelResponse {
  data: Array<{
    id: string;
    object: string;
    owned_by: string;
  }>;
  object: string;
}

interface ModelSettings {
  localModelUrl: string | null;
  selectedModel: string | null;
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
 * Directly fetch available models from a local LLM API endpoint
 */
export async function fetchLocalModels(localUrl: string): Promise<ModelResponse | null> {
  try {
    // Ensure URL has proper format
    let baseUrl = localUrl;
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    const modelsUrl = `${baseUrl}v1/models`;
    
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching local models:', errorText);
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Exception fetching local models:', error);
    return null;
  }
}

/**
 * Get the stored model settings from local storage (legacy support)
 */
export function getLocalModelSettings(): ModelSettings {
  try {
    const settings = localStorage.getItem('localModelSettings');
    if (settings) {
      return JSON.parse(settings);
    }
  } catch (error) {
    console.error('Error reading local model settings:', error);
  }
  
  return { localModelUrl: null, selectedModel: null };
}

/**
 * Save model settings to local storage (legacy support)
 */
export function saveLocalModelSettings(settings: ModelSettings): void {
  try {
    localStorage.setItem('localModelSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving local model settings:', error);
  }
}
