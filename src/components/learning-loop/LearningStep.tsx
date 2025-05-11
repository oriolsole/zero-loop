
import React from 'react';
import { LearningStep as LearningStepType } from '@/types/intelligence';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface LearningStepProps {
  step: LearningStepType;
  index: number;
}

const LearningStep: React.FC<LearningStepProps> = ({ step, index }) => {
  // Status indicator with appropriate icon and color
  const renderStatusIndicator = () => {
    switch (step.status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failure':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'pending':
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  // Badge variant based on step type
  const getBadgeVariant = () => {
    switch (step.type) {
      case 'task':
        return 'default';
      case 'solution':
        return 'secondary';
      case 'verification':
        return 'outline';
      case 'reflection':
        return 'destructive';
      case 'mutation':
        return 'purple';
      default:
        return 'default';
    }
  };

  return (
    <Card className={`p-4 mb-4 transition-opacity ${step.status === 'pending' ? 'opacity-50' : 'opacity-100'}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={getBadgeVariant()} className="capitalize">
            {step.type}
          </Badge>
          <h3 className="font-semibold">{step.title}</h3>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Status:</span>
          {renderStatusIndicator()}
        </div>
      </div>

      <div className="prose prose-sm max-w-none dark:prose-invert">
        {step.status === 'pending' ? (
          <div className="flex items-center gap-2 py-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{step.content}</div>
        )}
      </div>
      
      {step.metadata?.sources && step.metadata.sources.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="text-xs text-muted-foreground">
            This step references {step.metadata.sources.length} external source{step.metadata.sources.length > 1 ? 's' : ''}.
          </p>
        </div>
      )}
    </Card>
  );
};

export default LearningStep;
