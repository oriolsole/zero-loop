
import React from 'react';
import { Brain } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EmptyLoopStateProps {
  handleStartLoop: () => Promise<void>;
}

const EmptyLoopState: React.FC<EmptyLoopStateProps> = ({ handleStartLoop }) => {
  return (
    <Card className="border-dashed border-2 p-8 flex flex-col items-center justify-center">
      <div className="text-muted-foreground text-center">
        <Brain className="w-10 h-10 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No Learning Loop Active</h3>
        <p className="mb-4">Start a new learning loop to begin the intelligence cycle</p>
        <Button onClick={handleStartLoop}>Start New Loop</Button>
      </div>
    </Card>
  );
};

export default EmptyLoopState;
