
import React from 'react';
import { useLoopStore } from '../../store/useLoopStore';
import LearningStep from './LearningStep';
import EmptyLoopState from './EmptyLoopState';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Play, FastForward, Pause, SkipForward } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";

const LearningLoop: React.FC = () => {
  const { 
    domains, 
    activeDomainId,
    isRunningLoop,
    startNewLoop,
    advanceToNextStep,
    isContinuousMode,
    toggleContinuousMode,
    loopDelay,
    setLoopDelay,
    pauseLoops
  } = useLoopStore();

  const activeDomain = domains.find(domain => domain.id === activeDomainId);

  const isDomainWebKnowledge = activeDomain?.id === 'web-knowledge';
  const isAIReasoning = activeDomain?.name === 'AI Reasoning';

  const handleStartLoop = async () => {
    try {
      await startNewLoop();
    } catch (error) {
      console.error('Failed to start loop:', error);
      toast.error('Failed to start learning loop. Please try again.');
    }
  };

  const handleNextStep = async () => {
    try {
      await advanceToNextStep();
    } catch (error) {
      console.error('Failed to advance to next step:', error);
      toast.error('Failed to advance to next step. Please try again.');
    }
  };

  const handleToggleContinuous = () => {
    try {
      toggleContinuousMode();
    } catch (error) {
      console.error('Failed to toggle continuous mode:', error);
      toast.error('Failed to toggle continuous mode. Please try again.');
    }
  };

  // If active domain doesn't exist or has no steps yet
  if (!activeDomain || !activeDomain.currentLoop || activeDomain.currentLoop.length === 0) {
    return (
      <EmptyLoopState 
        handleStartLoop={handleStartLoop} 
        isDomainWebKnowledge={isDomainWebKnowledge}
        isAIReasoning={isAIReasoning}
      />
    );
  }

  const currentLoop = activeDomain.currentLoop;
  const completedSteps = currentLoop.filter(step => step.status !== 'pending');
  const allStepsComplete = completedSteps.length === currentLoop.length;
  const isLastStepPending = currentLoop[currentLoop.length - 1].status === 'pending';
  const canAdvance = !allStepsComplete && !isLastStepPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Learning Loop</h2>
          {isRunningLoop && (
            <Badge variant="outline" className="ml-2">
              {isContinuousMode ? 'Continuous Mode' : 'Interactive Mode'}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isRunningLoop ? (
            <Button onClick={handleStartLoop} variant="default" className="gap-1">
              <Play className="h-4 w-4" />
              Start Loop
            </Button>
          ) : (
            <>
              {isContinuousMode ? (
                <Button onClick={handleToggleContinuous} variant="outline" className="gap-1">
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              ) : (
                <Button 
                  onClick={handleNextStep} 
                  disabled={!canAdvance}
                  variant="default"
                  className="gap-1"
                >
                  {isLastStepPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      <SkipForward className="h-4 w-4" />
                      Next Step
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                onClick={handleToggleContinuous} 
                variant={isContinuousMode ? "default" : "outline"}
                className="gap-1"
              >
                <FastForward className="h-4 w-4" />
                {isContinuousMode ? 'Running' : 'Auto Run'}
              </Button>
            </>
          )}
        </div>
      </div>
      
      {isContinuousMode && (
        <Card className="p-4 bg-muted/50">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="continuous-mode">Continuous Mode</Label>
                <Switch 
                  id="continuous-mode" 
                  checked={isContinuousMode} 
                  onCheckedChange={handleToggleContinuous}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically advance through all learning steps
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-1/3">
              <Label htmlFor="speed" className="min-w-fit">Speed:</Label>
              <Slider
                id="speed"
                min={500}
                max={10000}
                step={500}
                value={[loopDelay]}
                onValueChange={(values) => setLoopDelay(values[0])}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground min-w-fit">
                {loopDelay / 1000}s
              </span>
            </div>
          </div>
        </Card>
      )}
      
      <Separator />
      
      <div className="space-y-4">
        {currentLoop.map((step, index) => (
          <LearningStep key={index} step={step} index={index} />
        ))}
      </div>
    </div>
  );
};

export default LearningLoop;
