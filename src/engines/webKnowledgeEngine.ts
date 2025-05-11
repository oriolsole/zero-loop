
import { DomainEngine } from '../types/intelligence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

// The web knowledge engine uses Google Search API through a Supabase Edge Function
export const webKnowledgeEngine: DomainEngine = {
  generateTask: async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'generateTask',
          domain: 'Web Knowledge',
          domainContext: 'Focus on generating research questions that can be answered by searching the web.'
        }
      });

      if (error) throw new Error(`Web knowledge error: ${error.message}`);
      return data.result || 'Failed to generate task';
    } catch (error) {
      console.error('Error generating web knowledge task:', error);
      toast.error('Failed to generate research question');
      return 'Error generating research question. Please try again later.';
    }
  },

  solveTask: async (task: string) => {
    try {
      // Here we would use Google Search API to find information, but for now we'll use AI
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'solveTask',
          task,
          domain: 'Web Knowledge',
          domainContext: 'For this task, imagine you are searching the web for information. Provide a detailed answer with what you might find.'
        }
      });

      if (error) throw new Error(`Web knowledge error: ${error.message}`);
      return data.result || 'Failed to research question';
    } catch (error) {
      console.error('Error researching question:', error);
      toast.error('Failed to research question');
      return 'Error researching question. Please try again later.';
    }
  },

  verifySolution: async (task: string, solution: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'verifySolution',
          task,
          solution,
          domain: 'Web Knowledge',
          domainContext: 'Evaluate the factual accuracy and completeness of this research answer.'
        }
      });

      if (error) throw new Error(`Web knowledge error: ${error.message}`);
      return data.result || 'Failed to verify research';
    } catch (error) {
      console.error('Error verifying research:', error);
      toast.error('Failed to verify research');
      return 'Error verifying research. Please try again later.';
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
          domain: 'Web Knowledge',
          domainContext: 'Analyze what we learned from this web research task and what insights we can extract.'
        }
      });

      if (error) throw new Error(`Web knowledge error: ${error.message}`);
      return data.result || 'Failed to reflect on research';
    } catch (error) {
      console.error('Error reflecting on research:', error);
      toast.error('Failed to reflect on research');
      return 'Error reflecting on research. Please try again later.';
    }
  },

  mutateTask: async (task: string, previousSteps: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'mutateTask',
          task,
          domain: 'Web Knowledge',
          domainContext: 'Create a new research question that builds on what we learned from the previous one.'
        }
      });

      if (error) throw new Error(`Web knowledge error: ${error.message}`);
      return data.result || 'Failed to create new research question';
    } catch (error) {
      console.error('Error creating new research question:', error);
      toast.error('Failed to create new research question');
      return 'Error creating new research question. Please try again later.';
    }
  }
};
