
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, Sparkles } from 'lucide-react';

interface EmptyLoopStateProps {
  handleStartLoop: () => void;
  isDomainWebKnowledge?: boolean;
  isAIReasoning?: boolean; // New prop to indicate if AI reasoning is being used
}

const EmptyLoopState: React.FC<EmptyLoopStateProps> = ({ 
  handleStartLoop, 
  isDomainWebKnowledge = false,
  isAIReasoning = false
}) => {
  return (
    <Card className="border-dashed border-2 p-8 flex flex-col items-center justify-center">
      <div className="text-muted-foreground text-center">
        {isAIReasoning ? (
          <Sparkles className="w-10 h-10 mx-auto mb-4 opacity-50" />
        ) : isDomainWebKnowledge ? (
          <svg className="w-10 h-10 mx-auto mb-4 opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        ) : (
          <Brain className="w-10 h-10 mx-auto mb-4 opacity-50" />
        )}
        <h3 className="text-lg font-medium mb-2">No Active Learning Loop</h3>
        <p className="mb-4">
          {isAIReasoning ? (
            "Start a new AI-powered learning loop to begin generating insights with advanced reasoning."
          ) : isDomainWebKnowledge ? (
            "Start a new learning loop to begin gathering knowledge from external sources."
          ) : (
            "Start a new learning loop to begin generating insights."
          )}
        </p>
        <Button onClick={handleStartLoop}>
          {isAIReasoning ? "Start AI Learning Loop" : "Start Learning Loop"}
        </Button>
      </div>
    </Card>
  );
};

export default EmptyLoopState;
