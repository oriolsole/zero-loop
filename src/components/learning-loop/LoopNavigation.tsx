
import React from 'react';
import { Button } from "@/components/ui/button";

interface LoopNavigationProps {
  handlePreviousLoop: () => void;
  handleStartLoop: () => Promise<void>;
  isRunningLoop: boolean;
  showNextLoop: boolean;
  isContinuousMode: boolean;
  totalLoops: number;
}

const LoopNavigation: React.FC<LoopNavigationProps> = ({ 
  handlePreviousLoop, 
  handleStartLoop, 
  isRunningLoop, 
  showNextLoop, 
  isContinuousMode,
  totalLoops 
}) => {
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={handlePreviousLoop}
      >
        Previous Loop
      </Button>
      <Button 
        variant="default" 
        size="sm"
        onClick={handleStartLoop}
        disabled={(isRunningLoop && !showNextLoop) || isContinuousMode}
      >
        Next Loop
      </Button>
      <span className="ml-auto text-sm text-muted-foreground">Loop #{totalLoops} of {totalLoops}</span>
    </div>
  );
};

export default LoopNavigation;
