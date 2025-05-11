
import { DomainEngine, ExternalSource } from '../types/intelligence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

/**
 * An AI-powered reasoning engine that uses OpenAI for generating tasks,
 * solutions, verifications, reflections, and mutations.
 */
export const aiReasoningEngine: DomainEngine = {
  /**
   * Generate a task using AI reasoning
   */
  generateTask: async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          action: 'generateTask',
          domain: 'general learning' 
        }
      });

      if (error) {
        console.error('Error generating task:', error);
        toast.error('Failed to generate task: ' + error.message);
        return 'Error generating task. Please try again.';
      }

      return data.result;
    } catch (error) {
      console.error('Exception generating task:', error);
      toast.error('An error occurred while generating the task');
      return 'Error generating task. Please try again.';
    }
  },

  /**
   * Solve a task using AI reasoning
   */
  solveTask: async (task: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          action: 'solveTask',
          domain: 'general learning',
          task 
        }
      });

      if (error) {
        console.error('Error solving task:', error);
        toast.error('Failed to solve task: ' + error.message);
        return 'Error solving task. Please try again.';
      }

      return data.result;
    } catch (error) {
      console.error('Exception solving task:', error);
      toast.error('An error occurred while solving the task');
      return 'Error solving task. Please try again.';
    }
  },

  /**
   * Verify a solution using AI reasoning
   */
  verifySolution: async (task: string, solution: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          action: 'verifySolution',
          domain: 'general learning',
          task,
          solution 
        }
      });

      if (error) {
        console.error('Error verifying solution:', error);
        toast.error('Failed to verify solution: ' + error.message);
        return 'Error verifying solution. Please try again.';
      }

      return data.result;
    } catch (error) {
      console.error('Exception verifying solution:', error);
      toast.error('An error occurred while verifying the solution');
      return 'Error verifying solution. Please try again.';
    }
  },

  /**
   * Generate reflections and insights using AI reasoning
   */
  reflect: async (task: string, solution: string, verification: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          action: 'reflect',
          domain: 'general learning',
          task,
          solution,
          verification 
        }
      });

      if (error) {
        console.error('Error reflecting:', error);
        toast.error('Failed to generate reflections: ' + error.message);
        return 'Error generating reflections. Please try again.';
      }

      return data.result;
    } catch (error) {
      console.error('Exception generating reflections:', error);
      toast.error('An error occurred while generating reflections');
      return 'Error generating reflections. Please try again.';
    }
  },

  /**
   * Mutate a task for the next iteration using AI reasoning
   */
  mutateTask: async (task: string, previousSteps: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          action: 'mutateTask',
          domain: 'general learning',
          task,
          previousSteps 
        }
      });

      if (error) {
        console.error('Error mutating task:', error);
        toast.error('Failed to mutate task: ' + error.message);
        return 'Error mutating task. Please try again.';
      }

      return data.result;
    } catch (error) {
      console.error('Exception mutating task:', error);
      toast.error('An error occurred while mutating the task');
      return 'Error mutating task. Please try again.';
    }
  },

  // Enhanced methods that leverage external knowledge - optional implementation
  enrichTask: async (task: string) => {
    try {
      // For now, we'll just return the original task without enrichment
      return { enrichedTask: task, sources: [] };
    } catch (error) {
      console.error('Exception when enriching task:', error);
      return { enrichedTask: task, sources: [] };
    }
  }
};
