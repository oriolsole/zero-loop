
import React from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

interface LoopControlsProps {
  isContinuousMode: boolean;
  canAdvanceStep: boolean;
  showNextLoop: boolean;
  isRunningLoop: boolean;
  loopDelay: number;
  totalLoops: number;
  handleNextStep: () => Promise<void>;
  handleStartLoop: () => Promise<void>;
  toggleContinuousMode: () => void;
  setLoopDelay: (delay: number) => void;
}

const LoopControls: React.FC<LoopControlsProps> = ({
  isContinuousMode,
  canAdvanceStep,
  showNextLoop,
  isRunningLoop,
  loopDelay,
  totalLoops,
  handleNextStep,
  handleStartLoop,
  toggleContinuousMode,
  setLoopDelay
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Current Learning Loop</h3>
        <div className="space-x-2">
          <Button 
            variant={isContinuousMode ? "default" : "outline"}
            size="sm"
            onClick={toggleContinuousMode}
            className="gap-1"
          >
            {isContinuousMode ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Auto</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Auto</span>
              </>
            )}
          </Button>
          
          {canAdvanceStep && !isContinuousMode && (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleNextStep}
            >
              Next Step
            </Button>
          )}
          
          {showNextLoop && !isContinuousMode && (
            <Button 
              variant="default" 
              size="sm"
              onClick={handleStartLoop}
              disabled={isRunningLoop && !showNextLoop}
            >
              {isRunningLoop ? "Complete & New Loop" : "Next Loop"}
            </Button>
          )}
        </div>
      </div>
      
      {/* Auto-run settings */}
      {isContinuousMode && (
        <Card className="bg-secondary/30">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="w-1/2">
                <div className="text-sm font-medium mb-1">Loop Delay: {loopDelay}ms</div>
                <Slider
                  value={[loopDelay]}
                  min={500}
                  max={5000}
                  step={500}
                  onValueChange={(values) => setLoopDelay(values[0])}
                  className="w-full"
                />
              </div>
              <div className="space-x-2">
                <Badge variant={isContinuousMode ? "default" : "secondary"} className="animate-pulse">
                  Auto Running
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Loop #{totalLoops}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LoopControls;
