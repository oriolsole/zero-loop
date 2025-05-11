
import { LoopState } from '../useLoopStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

type SetFunction = (
  partial: LoopState | Partial<LoopState> | ((state: LoopState) => LoopState | Partial<LoopState>),
  replace?: boolean,
) => void;

type GetFunction = () => LoopState;

export const createSyncActions = (
  set: SetFunction,
  get: GetFunction
) => ({
  // Web Knowledge verification function
  verifySolution: async (task: string, solution: string) => {
    try {
      // Initialize the useExternalKnowledge hook functions
      const knowledgeModule = await import('../../hooks/useExternalKnowledge');
      const { verifyWithKnowledge } = knowledgeModule.useExternalKnowledge();
      
      // Use the knowledge base and web to verify the solution
      const verificationResult = await verifyWithKnowledge(solution, { 
        useWeb: true, 
        useKnowledgeBase: true,
        limit: 3
      });
      
      // Call the AI for verification with the sources as context
      // Fix: Use the imported supabase client to avoid the error
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
      
      return data?.result || 'Failed to verify research';
    } catch (error) {
      console.error('Error verifying research:', error);
      toast.error('Failed to verify research');
      return 'Error verifying research. Please try again later.';
    }
  }
});
