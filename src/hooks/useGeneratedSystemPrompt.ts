
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGeneratedSystemPromptProps {
  customPrompt?: string;
  useCustomPrompt?: boolean;
  loopEnabled?: boolean;
  agentId?: string | null;
}

export const useGeneratedSystemPrompt = ({ 
  customPrompt, 
  useCustomPrompt, 
  loopEnabled,
  agentId 
}: UseGeneratedSystemPromptProps) => {
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGeneratedPrompt = async () => {
    if (!supabase) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the system prompt generation endpoint
      const { data, error: functionError } = await supabase.functions.invoke('generate-system-prompt', {
        body: {
          customPrompt: useCustomPrompt ? customPrompt : undefined,
          loopEnabled: loopEnabled || false,
          loopIteration: 0,
          agentId: agentId || null
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data?.systemPrompt) {
        setGeneratedPrompt(data.systemPrompt);
      } else {
        throw new Error('No system prompt returned');
      }
    } catch (err) {
      console.error('Error fetching generated system prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch system prompt');
      // Fallback to a basic prompt
      setGeneratedPrompt('Unable to load system prompt. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGeneratedPrompt();
  }, [customPrompt, useCustomPrompt, loopEnabled, agentId]);

  return {
    generatedPrompt,
    isLoading,
    error,
    refetch: fetchGeneratedPrompt
  };
};
