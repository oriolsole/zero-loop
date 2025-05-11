
import React from 'react';
import { Button } from "@/components/ui/button";
import { LearningStep } from '@/types/intelligence';

interface LoopControlsProps {
  isLastStep: boolean;
  onAdvance: () => Promise<void>;
  currentStep: LearningStep | null;
}

const LoopControls: React.FC<LoopControlsProps> = ({
  isLastStep,
  onAdvance,
  currentStep
}) => {
  return (
    <div className="flex justify-end mt-4">
      <Button 
        onClick={onAdvance}
        disabled={!currentStep}
        variant={isLastStep ? "default" : "outline"}
      >
        {isLastStep ? "Complete Loop & Generate Insights" : "Next Step"}
      </Button>
    </div>
  );
};

export default LoopControls;
