
import { useState, useCallback } from 'react';

export type AIPhase = 'idle' | 'thinking' | 'planning' | 'executing' | 'analyzing' | 'synthesizing' | 'completed';

export interface AIPhaseDetails {
  phase: AIPhase;
  description: string;
  startTime: Date;
  estimatedDuration?: number;
}

export const useAIPhases = () => {
  const [currentPhase, setCurrentPhase] = useState<AIPhase>('idle');
  const [phaseDetails, setPhaseDetails] = useState<string>('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);
  const [phaseHistory, setPhaseHistory] = useState<AIPhaseDetails[]>([]);

  const setPhase = useCallback((phase: AIPhase, details: string = '', estimatedDuration?: number) => {
    console.log(`AI Phase: ${phase} - ${details}`);
    
    setCurrentPhase(phase);
    setPhaseDetails(details);
    setEstimatedTimeRemaining(estimatedDuration || 0);
    
    const phaseDetail: AIPhaseDetails = {
      phase,
      description: details,
      startTime: new Date(),
      estimatedDuration
    };
    
    setPhaseHistory(prev => [...prev, phaseDetail]);
  }, []);

  const resetPhases = useCallback(() => {
    setCurrentPhase('idle');
    setPhaseDetails('');
    setEstimatedTimeRemaining(0);
    setPhaseHistory([]);
  }, []);

  const getCurrentPhaseInfo = useCallback(() => {
    return {
      phase: currentPhase,
      details: phaseDetails,
      estimatedTimeRemaining,
      history: phaseHistory
    };
  }, [currentPhase, phaseDetails, estimatedTimeRemaining, phaseHistory]);

  return {
    currentPhase,
    phaseDetails,
    estimatedTimeRemaining,
    phaseHistory,
    setPhase,
    resetPhases,
    getCurrentPhaseInfo
  };
};
