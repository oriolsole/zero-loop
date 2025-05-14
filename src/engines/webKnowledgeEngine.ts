
import { DomainEngine } from '../types/intelligence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ExternalSource } from '@/types/intelligence';

// The web knowledge engine uses Google Search API through a Supabase Edge Function
// and integrates with the local knowledge base
export const webKnowledgeEngine: DomainEngine = {
  generateTask: async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'generateTask',
          domain: 'Web Knowledge',
          domainContext: 'Focus on generating research questions that can be answered by searching the web or knowledge base.'
        }
      });

      if (error) throw new Error(`Web knowledge error: ${error.message}`);
      return data?.result || 'Failed to generate task';
    } catch (error) {
      console.error('Error generating web knowledge task:', error);
      toast.error('Failed to generate research question');
      return 'Error generating research question. Please try again later.';
    }
  },

  solveTask: async (task: string) => {
    try {
      // Initialize the useExternalKnowledge hook functions
      const knowledgeModule = await import('../hooks/useExternalKnowledge');
      const { searchKnowledge } = knowledgeModule.useExternalKnowledge();
      
      // Search for information from both knowledge base and web
      const sources = await searchKnowledge(task, { 
        useWeb: true, 
        useKnowledgeBase: true,
        limit: 5
      });
      
      // If we have sources, generate a response using AI with the sources as context
      let solution = '';
      let usedSources: ExternalSource[] = [];
      
      if (sources.length > 0) {
        // Format the sources for the AI
        const sourceInfo = sources.map(
          (source, index) => `[${index + 1}] "${source.title}": ${source.snippet}`
        ).join('\n\n');
        
        // Call the AI with the sources as context
        const { data, error } = await supabase.functions.invoke('ai-reasoning', {
          body: { 
            operation: 'solveTask',
            task,
            domain: 'Web Knowledge',
            domainContext: `Based on the following sources, answer the question:\n\n${sourceInfo}`
          }
        });

        if (error) throw new Error(`AI reasoning error: ${error.message}`);
        solution = data?.result || 'Failed to research question';
        usedSources = sources;
      } else {
        // Fallback to purely AI-generated answer if no sources found
        const { data, error } = await supabase.functions.invoke('ai-reasoning', {
          body: { 
            operation: 'solveTask',
            task,
            domain: 'Web Knowledge',
            domainContext: 'For this task, imagine you are searching the web for information. Provide a detailed answer with what you might find.'
          }
        });

        if (error) throw new Error(`Web knowledge error: ${error.message}`);
        solution = data?.result || 'Failed to research question';
      }
      
      // Add metadata about the used sources
      return solution;
    } catch (error) {
      console.error('Error researching question:', error);
      toast.error('Failed to research question');
      return 'Error researching question. Please try again later.';
    }
  },

  verifySolution: async (task: string, solution: string) => {
    try {
      // Initialize the useExternalKnowledge hook functions
      const knowledgeModule = await import('../hooks/useExternalKnowledge');
      const { verifyWithKnowledge } = knowledgeModule.useExternalKnowledge();
      
      // Use the knowledge base and web to verify the solution
      const verificationResult = await verifyWithKnowledge(solution, { 
        useWeb: true, 
        useKnowledgeBase: true,
        limit: 3
      });
      
      // Call the AI for verification with the sources as context
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'verifySolution',
          task,
          solution,
          domain: 'Web Knowledge',
          domainContext: `Evaluate the factual accuracy and completeness of this research answer. Confidence score: ${verificationResult.confidence}.`
        }
      });

      if (error) throw new Error(`Web knowledge error: ${error.message}`);
      
      return {
        isCorrect: verificationResult.confidence > 0.5,
        explanation: data?.result || 'Failed to verify research'
      };
    } catch (error) {
      console.error('Error verifying research:', error);
      toast.error('Failed to verify research');
      return {
        isCorrect: false,
        explanation: 'Error verifying research. Please try again later.'
      };
    }
  },

  reflect: async (task: string, solution: string, verification: string) => {
    try {
      // Call the AI for reflection
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
      
      return data?.result || 'Failed to reflect on research';
    } catch (error) {
      console.error('Error reflecting on research:', error);
      toast.error('Failed to reflect on research');
      return 'Error reflecting on research. Please try again later.';
    }
  },

  mutateTask: async (task: string, solution: string, verification: string, reflection: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-reasoning', {
        body: { 
          operation: 'mutateTask',
          task,
          solution,
          verification,
          reflection,
          domain: 'Web Knowledge',
          domainContext: 'Create a new research question that builds on what we learned from the previous one.'
        }
      });

      if (error) throw new Error(`Web knowledge error: ${error.message}`);
      return data?.result || 'Failed to create new research question';
    } catch (error) {
      console.error('Error creating new research question:', error);
      toast.error('Failed to create new research question');
      return 'Error creating new research question. Please try again later.';
    }
  }
};
