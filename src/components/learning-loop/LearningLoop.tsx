
import React, { useState, useEffect } from 'react';
import { useLoopStore } from '../../store/useLoopStore';
import LearningStep from './LearningStep';
import EmptyLoopState from './EmptyLoopState';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Play, FastForward, Pause, SkipForward, X, CheckCircle, RotateCw } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LearningStep as LearningStepType } from '@/types/intelligence';

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
    pauseLoops,
    cancelCurrentLoop
  } = useLoopStore();

  // Debug state to track step details
  const [debugInfo, setDebugInfo] = useState<{currentLoop: any, canAdvance: boolean}>({
    currentLoop: null,
    canAdvance: false
  });

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
      toast.success(isContinuousMode ? 'Continuous mode disabled' : 'Continuous mode enabled');
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

  const currentLoop: LearningStepType[] = activeDomain.currentLoop || [];
  
  // No loop steps means we need to show the empty state
  if (currentLoop.length === 0) {
    return (
      <EmptyLoopState 
        handleStartLoop={handleStartLoop} 
        isDomainWebKnowledge={isDomainWebKnowledge}
        isAIReasoning={isAIReasoning}
      />
    );
  }
  
  const completedSteps = currentLoop.filter(step => step.status === 'success');
  const pendingSteps = currentLoop.filter(step => step.status === 'pending');
  
  // Check if all steps are complete
  const allStepsComplete = completedSteps.length === currentLoop.length;
  
  // Check if there's a step currently in progress (not pending or success, which means it's failure or warning)
  const hasInProgressStep = currentLoop.some(step => step.status !== 'success' && step.status !== 'pending');
  
  // Check if the last step is pending (which means we're waiting for it to complete)
  const isLastStepPending = currentLoop[currentLoop.length - 1].status === 'pending';
  
  // We can advance if there are more steps to complete and no step is currently pending processing
  // MODIFIED: Make sure first step is success before allowing advancement
  const firstStepIsSuccess = currentLoop.length > 0 && currentLoop[0].status === 'success';
  const canAdvance = !allStepsComplete && !isLastStepPending && !hasInProgressStep && firstStepIsSuccess;
  
  // Log debug information
  console.log("Loop status:", {
    firstStepIsSuccess,
    canAdvance,
    allStepsComplete,
    isLastStepPending,
    hasInProgressStep,
    stepsCount: currentLoop.length,
    firstStepStatus: currentLoop[0]?.status
  });
  
  // Determine what button/state to show
  const isLoopFinished = allStepsComplete && !hasInProgressStep && !isLastStepPending;

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
          {isLoopFinished && (
            <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-600 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" /> Complete
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 gap-1">
                    <X className="h-4 w-4" />
                    Cancel Loop
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel learning loop?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel the current learning loop. Any progress in this loop will not be saved to your knowledge graph.
                      You will be able to start a new learning loop or switch domains after cancellation.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Continue Learning</AlertDialogCancel>
                    <AlertDialogAction onClick={cancelCurrentLoop} className="bg-red-500 hover:bg-red-600">
                      Cancel Loop
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {isContinuousMode ? (
                <Button onClick={handleToggleContinuous} variant="outline" className="gap-1">
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              ) : isLoopFinished ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={handleStartLoop} 
                        variant="default" 
                        className="gap-1 bg-green-600 hover:bg-green-700"
                      >
                        <RotateCw className="h-4 w-4" />
                        Start New Loop
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Current loop is complete. Start a new learning cycle.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
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
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {!canAdvance && !isLoopFinished ? (
                        <p>
                          {isLastStepPending 
                            ? "Please wait for the current step to complete" 
                            : !firstStepIsSuccess
                              ? "First step is not completed successfully"
                              : hasInProgressStep 
                                ? "A step is currently in progress" 
                                : "All steps are complete"}
                        </p>
                      ) : (
                        <p>Click to advance to the next step in the learning process</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {!isLoopFinished && (
                <Button 
                  onClick={handleToggleContinuous} 
                  variant={isContinuousMode ? "default" : "outline"}
                  className="gap-1"
                >
                  <FastForward className="h-4 w-4" />
                  {isContinuousMode ? 'Running' : 'Auto Run'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {isLoopFinished && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Learning loop completed successfully. You can now start a new loop or review the insights generated.
          </AlertDescription>
        </Alert>
      )}
      
      {isContinuousMode && !isLoopFinished && (
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

      {/* Status Debug Info Card */}
      <Card className="p-4 bg-yellow-50 border-yellow-100">
        <h3 className="font-medium mb-2">Loop Status</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex gap-1 text-sm">
            <span className="font-medium">First Step Status:</span> 
            <span className={firstStepIsSuccess ? "text-green-600" : "text-red-500"}>
              {currentLoop[0]?.status || "unknown"}
            </span>
          </div>
          <div className="flex gap-1 text-sm">
            <span className="font-medium">Can Advance:</span> 
            <span className={canAdvance ? "text-green-600" : "text-red-500"}>
              {canAdvance ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex gap-1 text-sm">
            <span className="font-medium">Continuous Mode:</span> 
            <span>{isContinuousMode ? "Enabled" : "Disabled"}</span>
          </div>
          <div className="flex gap-1 text-sm">
            <span className="font-medium">Steps Complete:</span> 
            <span>{completedSteps.length}/{currentLoop.length}</span>
          </div>
        </div>
      </Card>
      
      <Separator />
      
      <div className="space-y-4">
        {Array.isArray(currentLoop) && currentLoop.map((step, index) => (
          <LearningStep key={index} step={step} index={index} />
        ))}
      </div>
    </div>
  );
};

export default LearningLoop;
