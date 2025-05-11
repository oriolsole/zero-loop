
import { DomainEngine } from '../types/intelligence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

// The AI reasoning engine integrates with OpenAI through a Supabase Edge Function
export const aiReasoningEngine: DomainEngine = {
  generateTask: async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'generateTask',
          domain: 'AI Reasoning' 
        }
      });

      if (error) throw new Error(`AI reasoning error: ${error.message}`);
      return data.result || 'Failed to generate task';
    } catch (error) {
      console.error('Error generating task:', error);
      toast.error('Failed to generate task');
      return 'Error generating task. Please try again later.';
    }
  },

  solveTask: async (task: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'solveTask',
          task,
          domain: 'AI Reasoning' 
        }
      });

      if (error) throw new Error(`AI reasoning error: ${error.message}`);
      return data.result || 'Failed to solve task';
    } catch (error) {
      console.error('Error solving task:', error);
      toast.error('Failed to solve task');
      return 'Error solving task. Please try again later.';
    }
  },

  verifySolution: async (task: string, solution: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'verifySolution',
          task,
          solution,
          domain: 'AI Reasoning' 
        }
      });

      if (error) throw new Error(`AI reasoning error: ${error.message}`);
      return data.result || 'Failed to verify solution';
    } catch (error) {
      console.error('Error verifying solution:', error);
      toast.error('Failed to verify solution');
      return 'Error verifying solution. Please try again later.';
    }
  },

  reflect: async (task: string, solution: string, verification: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'reflect',
          task,
          solution,
          verification,
          domain: 'AI Reasoning' 
        }
      });

      if (error) throw new Error(`AI reasoning error: ${error.message}`);
      return data.result || 'Failed to reflect on task';
    } catch (error) {
      console.error('Error reflecting on task:', error);
      toast.error('Failed to reflect on task');
      return 'Error reflecting on task. Please try again later.';
    }
  },

  mutateTask: async (task: string, previousSteps: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'mutateTask',
          task,
          domain: 'AI Reasoning' 
        }
      });

      if (error) throw new Error(`AI reasoning error: ${error.message}`);
      return data.result || 'Failed to mutate task';
    } catch (error) {
      console.error('Error mutating task:', error);
      toast.error('Failed to mutate task');
      return 'Error mutating task. Please try again later.';
    }
  }
};
