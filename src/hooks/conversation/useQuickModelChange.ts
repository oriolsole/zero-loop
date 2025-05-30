
import { useState } from 'react';
import { agentService, Agent } from '@/services/agentService';
import { toast } from '@/components/ui/sonner';

export const useQuickModelChange = () => {
  const [isChangingModel, setIsChangingModel] = useState(false);

  const changeAgentModel = async (agent: Agent, newModelId: string): Promise<Agent | null> => {
    if (!agent || agent.model === newModelId) return agent;

    setIsChangingModel(true);
    try {
      const updatedAgent = await agentService.updateAgent({
        id: agent.id,
        model: newModelId
      });

      if (updatedAgent) {
        toast.success(`Model changed to ${newModelId}`);
        return updatedAgent;
      } else {
        toast.error('Failed to update agent model');
        return null;
      }
    } catch (error) {
      console.error('Error changing agent model:', error);
      toast.error('Failed to change model');
      return null;
    } finally {
      setIsChangingModel(false);
    }
  };

  return {
    changeAgentModel,
    isChangingModel
  };
};
