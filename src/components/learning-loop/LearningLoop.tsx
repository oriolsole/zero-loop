
import React, { useState, useEffect } from 'react';
import { useLoopStore } from '../../store/useLoopStore';
import LearningStep from './LearningStep';
import EmptyLoopState from './EmptyLoopState';
import LoopControls from './LoopControls';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Play, FastForward, Pause, SkipForward, X, CheckCircle, RotateCw } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  // IMPORTANT: Declare ALL hooks at the top level, before any conditional returns
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

  // Debug state to track step details - always declare this even if not used
  const [debugInfo, setDebugInfo] = useState<{currentLoop: any, canAdvance: boolean}>({
    currentLoop: null,
    canAdvance: false
  });

  // Get the active domain
  const activeDomain = domains.find(domain => domain.id === activeDomainId);
  const isDomainWebKnowledge = activeDomain?.id === 'web-knowledge';
  const isAIReasoning = activeDomain?.name === 'AI Reasoning';
  
  // Initialize currentLoop outside conditionals to prevent issues
  const currentLoop: LearningStepType[] = activeDomain?.currentLoop || [];
  
  const completedSteps = currentLoop.filter(step => step.status === 'success');
  const pendingSteps = currentLoop.filter(step => step.status === 'pending');
  
  const hasCompletedAllStepTypes = 
    currentLoop.some(step => step.type === 'task') &&
    currentLoop.some(step => step.type === 'solution') &&
    currentLoop.some(step => step.type === 'verification') &&
    currentLoop.some(step => step.type === 'reflection') &&
    currentLoop.some(step => step.type === 'mutation');
  
  const allStepsComplete = hasCompletedAllStepTypes && completedSteps.length === currentLoop.length;
  const hasInProgressStep = currentLoop.some(step => step.status !== 'success' && step.status !== 'pending');
  const isLastStepPending = currentLoop.length > 0 ? currentLoop[currentLoop.length - 1].status === 'pending' : false;
  
  const firstStepIsSuccess = currentLoop.length > 0 && currentLoop[0].status === 'success';
  const canAdvance = !isLastStepPending && !hasInProgressStep && firstStepIsSuccess && !hasCompletedAllStepTypes;
  
  const currentStepType = currentLoop.length > 0 ? currentLoop[currentLoop.length - 1].type : null;
  const nextStepType = currentStepType ? getNextStepType(currentStepType) : null;
  
  const isLoopFinished = allStepsComplete && !hasInProgressStep && !isLastStepPending;

  useEffect(() => {
    if (currentLoop.length > 0) {
      console.log("Loop status:", {
        firstStepIsSuccess,
        canAdvance,
        allStepsComplete,
        isLastStepPending,
        hasInProgressStep,
        hasCompletedAllStepTypes,
        currentStepType,
        nextStepType,
        stepsCount: currentLoop.length,
        firstStepStatus: currentLoop[0]?.status
      });
    }
  }, [currentLoop, firstStepIsSuccess, canAdvance, allStepsComplete, isLastStepPending, hasInProgressStep, hasCompletedAllStepTypes, currentStepType, nextStepType]);

  // Helper function to determine next step type
  function getNextStepType(currentType: string): string {
    switch (currentType) {
      case 'task':
        return 'solution';
      case 'solution':
        return 'verification';
      case 'verification':
        return 'reflection';
      case 'reflection':
        return 'mutation';
      default:
        return 'complete';
    }
  }

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

  // If active domain doesn't exist or has no steps yet, render the empty state
  if (!activeDomain || !activeDomain.currentLoop || activeDomain.currentLoop.length === 0) {
    return (
      <EmptyLoopState 
        handleStartLoop={handleStartLoop} 
        isDomainWebKnowledge={isDomainWebKnowledge}
        isAIReasoning={isAIReasoning}
      />
    );
  }
  
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
                              Next Step {nextStepType && `(${nextStepType})`}
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
                              : hasCompletedAllStepTypes 
                                ? "All step types have been completed" 
                                : hasInProgressStep 
                                  ? "A step is currently in progress" 
                                  : "All steps are complete"}
                        </p>
                      ) : (
                        <p>Click to advance to the next step ({nextStepType}) in the learning process</p>
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

      {/* Debug Status Card has been removed */}
      
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
