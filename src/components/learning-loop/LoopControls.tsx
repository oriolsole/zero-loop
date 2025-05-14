
import React from 'react';
import { Button } from "@/components/ui/button";
import { LearningStep } from '@/types/intelligence';
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
import { X, Loader2, ArrowRight, SkipForward } from 'lucide-react';
import { useLoopStore } from '@/store/useLoopStore';

interface LoopControlsProps {
  isLastStep: boolean;
  onAdvance: () => Promise<void>;
  currentStep: LearningStep | null;
  canAdvance: boolean;
  isLoading: boolean;
  nextStepType?: string;
}

const LoopControls: React.FC<LoopControlsProps> = ({
  isLastStep,
  onAdvance,
  currentStep,
  canAdvance,
  isLoading,
  nextStepType = "Next"
}) => {
  const { cancelCurrentLoop } = useLoopStore();
  
  return (
    <div className="flex justify-between mt-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="outline" 
            className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 gap-1"
          >
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
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button 
                onClick={onAdvance}
                disabled={!canAdvance || isLoading}
                variant={isLastStep ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isLastStep ? (
                  "Complete Loop & Generate Insights"
                ) : (
                  <>
                    <SkipForward className="h-4 w-4" />
                    Next Step {nextStepType ? `(${nextStepType})` : ''}
                  </>
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {!canAdvance ? (
              <p>
                {isLoading
                  ? "Please wait for the current step to complete"
                  : "Current step must be completed successfully before advancing"}
              </p>
            ) : (
              <p>Click to advance to the next step in the learning process</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default LoopControls;
