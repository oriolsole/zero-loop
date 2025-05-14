
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Globe, Brain } from 'lucide-react';

interface EmptyLoopStateProps {
  handleStartLoop: () => Promise<void>;
  isDomainWebKnowledge?: boolean;
  isAIReasoning?: boolean;
}

const EmptyLoopState: React.FC<EmptyLoopStateProps> = ({
  handleStartLoop,
  isDomainWebKnowledge = false,
  isAIReasoning = false
}) => {
  return (
    <Card className="border-2 border-dashed p-8 text-center">
      <CardHeader>
        <CardTitle className="text-xl flex justify-center items-center gap-2">
          {isDomainWebKnowledge ? (
            <>
              <Globe className="h-5 w-5 text-green-500" />
              Start Web Knowledge Learning
            </>
          ) : isAIReasoning ? (
            <>
              <Brain className="h-5 w-5 text-purple-500" />
              Start AI-Powered Learning
            </>
          ) : (
            <>
              <Brain className="h-5 w-5" />
              Start Learning Loop
            </>
          )}
        </CardTitle>
        <CardDescription className="text-base mt-2">
          {isDomainWebKnowledge 
            ? "Generate tasks enhanced with web knowledge to improve learning outcomes."
            : isAIReasoning
              ? "Let the AI create and solve tasks autonomously for enhanced learning."
              : "Begin a new learning cycle to generate insights and build knowledge."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="py-4">
        <div className="text-muted-foreground text-sm max-w-md mx-auto">
          {isDomainWebKnowledge ? (
            <p>This domain will use web search to enrich the learning process with external knowledge.</p>
          ) : isAIReasoning ? (
            <p>AI reasoning provides a more autonomous learning experience with minimal user intervention.</p>
          ) : (
            <p>Start a new learning loop to observe how the system solves problems and generates insights.</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-center pt-4">
        <Button 
          onClick={handleStartLoop} 
          size="lg"
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Start Learning
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EmptyLoopState;
