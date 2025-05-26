
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { ExecutionPlan, PlanStep } from '@/hooks/usePlanOrchestrator';

interface PlanExecutionProgressProps {
  plan: ExecutionPlan;
  progress: { current: number; total: number; percentage: number };
}

const PlanExecutionProgress: React.FC<PlanExecutionProgressProps> = ({ plan, progress }) => {
  const getStepIcon = (step: PlanStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'executing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepBadgeColor = (step: PlanStep) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'executing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            {plan.title}
          </CardTitle>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            {progress.current}/{progress.total} steps
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
        <Progress value={progress.percentage} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {plan.steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              step.status === 'executing' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex-shrink-0">
              {getStepIcon(step)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{step.description}</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getStepBadgeColor(step)}`}
                >
                  {step.status}
                </Badge>
              </div>
              {step.status === 'executing' && (
                <div className="text-xs text-blue-600">
                  Estimated completion: ~{step.estimatedDuration}s
                </div>
              )}
              {step.status === 'failed' && step.error && (
                <div className="text-xs text-red-600">
                  Error: {step.error}
                </div>
              )}
              {step.status === 'completed' && step.endTime && step.startTime && (
                <div className="text-xs text-green-600">
                  Completed in {Math.round((new Date(step.endTime).getTime() - new Date(step.startTime).getTime()) / 1000)}s
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PlanExecutionProgress;
