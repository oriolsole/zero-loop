
import React, { useState, useEffect } from 'react';
import StatusMessage from './StatusMessage';

interface ProgressiveThinkingProps {
  steps: string[];
  onComplete?: () => void;
  stepDelay?: number;
}

const ProgressiveThinking: React.FC<ProgressiveThinkingProps> = ({ 
  steps, 
  onComplete, 
  stepDelay = 1000 
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<string[]>([]);

  useEffect(() => {
    if (currentStepIndex < steps.length) {
      const timer = setTimeout(() => {
        setVisibleSteps(prev => [...prev, steps[currentStepIndex]]);
        setCurrentStepIndex(prev => prev + 1);
      }, stepDelay);

      return () => clearTimeout(timer);
    } else if (currentStepIndex === steps.length && onComplete) {
      const timer = setTimeout(onComplete, stepDelay);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, steps, onComplete, stepDelay]);

  return (
    <div className="space-y-2">
      {visibleSteps.map((step, index) => (
        <StatusMessage 
          key={index}
          content={step}
          type={index === visibleSteps.length - 1 && currentStepIndex < steps.length ? 'thinking' : 'info'}
          isAnimated={index === visibleSteps.length - 1 && currentStepIndex < steps.length}
        />
      ))}
    </div>
  );
};

export default ProgressiveThinking;
