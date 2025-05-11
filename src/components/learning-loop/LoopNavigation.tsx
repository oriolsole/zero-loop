
import React from 'react';
import { Button } from "@/components/ui/button";
import { LearningStep } from '@/types/intelligence';

interface LoopNavigationProps {
  steps: LearningStep[];
  currentStepIndex: number | null;
}

const LoopNavigation: React.FC<LoopNavigationProps> = ({ 
  steps,
  currentStepIndex
}) => {
  // This component currently just displays the steps status
  // It will be expanded with navigation functionality later
  
  return (
    <div className="mb-4 flex items-center gap-3">
      {steps.map((step, index) => (
        <div 
          key={index}
          className={`h-2 w-1/5 rounded-full ${
            index === currentStepIndex 
              ? 'bg-primary animate-pulse' 
              : index < (currentStepIndex || 0)
                ? step.status === 'success'
                  ? 'bg-success'
                  : step.status === 'failure'
                    ? 'bg-destructive'
                    : 'bg-warning'
                : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
};

export default LoopNavigation;
