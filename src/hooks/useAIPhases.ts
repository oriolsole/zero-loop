
import { useState, useCallback } from 'react';
import { AIPhase } from '@/components/knowledge/ProgressPhaseIndicator';

export interface UseAIPhasesReturn {
  currentPhase: AIPhase;
  phaseDetails: string;
  estimatedTimeRemaining: number;
  setPhase: (phase: AIPhase, details?: string, estimatedTime?: number) => void;
  nextPhase: () => void;
  resetPhases: () => void;
}

const phaseSequence: AIPhase[] = ['analyzing', 'planning', 'executing', 'reflecting', 'completed'];

export const useAIPhases = (): UseAIPhasesReturn => {
  const [currentPhase, setCurrentPhase] = useState<AIPhase>('analyzing');
  const [phaseDetails, setPhaseDetails] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

  const setPhase = useCallback((phase: AIPhase, details = '', estimatedTime = 0) => {
    setCurrentPhase(phase);
    setPhaseDetails(details);
    setEstimatedTimeRemaining(estimatedTime);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseSequence.indexOf(currentPhase);
    if (currentIndex < phaseSequence.length - 1) {
      setCurrentPhase(phaseSequence[currentIndex + 1]);
    }
  }, [currentPhase]);

  const resetPhases = useCallback(() => {
    setCurrentPhase('analyzing');
    setPhaseDetails('');
    setEstimatedTimeRemaining(0);
  }, []);

  return {
    currentPhase,
    phaseDetails,
    estimatedTimeRemaining,
    setPhase,
    nextPhase,
    resetPhases
  };
};
