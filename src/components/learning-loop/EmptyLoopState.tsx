
import React from 'react';
import { Brain, Globe, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface EmptyLoopStateProps {
  handleStartLoop: () => Promise<void>;
  isDomainWebKnowledge?: boolean;
}

const EmptyLoopState: React.FC<EmptyLoopStateProps> = ({ 
  handleStartLoop,
  isDomainWebKnowledge = false 
}) => {
  return (
    <Card className="border-dashed border-2 p-8 flex flex-col items-center justify-center">
      <div className="text-muted-foreground text-center max-w-lg">
        <Brain className="w-10 h-10 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No Learning Loop Active</h3>
        <p className="mb-4">Start a new learning loop to begin the intelligence cycle</p>
        
        {isDomainWebKnowledge && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-center gap-2 mb-3 text-knowledge">
              <Globe className="w-5 h-5" />
              <span className="font-medium">Web Knowledge Integration</span>
            </div>
            <p className="text-sm mb-4">
              This domain can access the web to enhance learning with external knowledge sources.
              Tasks will be enriched with relevant web information.
            </p>
          </>
        )}
        
        <Button onClick={handleStartLoop}>
          {isDomainWebKnowledge ? (
            <span className="flex items-center gap-2">
              Start New Loop <Search className="w-4 h-4" />
            </span>
          ) : (
            'Start New Loop'
          )}
        </Button>
      </div>
    </Card>
  );
};

export default EmptyLoopState;
