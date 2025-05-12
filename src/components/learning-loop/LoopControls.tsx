
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
import { X } from 'lucide-react';
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
        disabled={!currentStep}
        variant={isLastStep ? "default" : "outline"}
      >
        {isLastStep ? "Complete Loop & Generate Insights" : "Next Step"}
      </Button>
    </div>
  );
};

export default LoopControls;
