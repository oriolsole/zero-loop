
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
import { X, Loader2, ArrowRight } from 'lucide-react';
import { useLoopStore } from '@/store/useLoopStore';

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
  const { cancelCurrentLoop } = useLoopStore();
  
  // Determine if the current step is in a loading/pending state
  const isLoading = currentStep?.status === 'pending';
  
  // Determine if button should be enabled - we'll allow advancing if the step is loaded (not pending)
  const canAdvance = currentStep && !isLoading;
  
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
      
      <Button 
        onClick={onAdvance}
        disabled={!canAdvance}
        variant={isLastStep ? "default" : "outline"}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating task...
          </>
        ) : isLastStep ? (
          "Complete Loop & Generate Insights"
        ) : (
          <>
            Next Step
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
};

export default LoopControls;
