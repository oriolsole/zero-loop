
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader2, Brain, Zap } from 'lucide-react';
import { DynamicExecutionPlan, DynamicPlanStep } from '@/hooks/useDynamicPlanOrchestrator';

interface PlanExecutionProgressProps {
  plan: DynamicExecutionPlan;
  progress: { current: number; total: number; percentage: number };
}

const PlanExecutionProgress: React.FC<PlanExecutionProgressProps> = ({ plan, progress }) => {
  const getStepIcon = (step: DynamicPlanStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'executing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepStatusStyle = (step: DynamicPlanStep) => {
    switch (step.status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm';
      case 'executing':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md ring-2 ring-blue-100';
      case 'failed':
        return 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 shadow-sm';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getToolIcon = (toolName: string) => {
    if (toolName.includes('search')) return '🔍';
    if (toolName.includes('github')) return '📁';
    if (toolName.includes('knowledge')) return '📚';
    return '⚡';
  };

  return (
    <Card className="mb-6 border-0 shadow-lg bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-800">{plan.title}</div>
              <div className="text-sm text-gray-600 font-normal">{plan.description}</div>
            </div>
            {plan.isAdaptive && (
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                <Zap className="h-3 w-3 mr-1" />
                AI-Adaptive
              </Badge>
            )}
          </CardTitle>
          <div className="text-right">
            <Badge variant="outline" className="bg-white/80 text-blue-700 border-blue-200 text-sm px-3 py-1">
              {progress.current}/{progress.total} steps
            </Badge>
            <div className="text-xs text-gray-500 mt-1">{progress.percentage}% complete</div>
          </div>
        </div>
        <Progress value={progress.percentage} className="mt-4 h-3 bg-white/60" />
      </CardHeader>
      <CardContent className="space-y-4">
        {plan.steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${getStepStatusStyle(step)}`}
          >
            <div className="flex-shrink-0">
              {getStepIcon(step)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-semibold text-gray-800">{step.description}</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-medium ${
                      step.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' :
                      step.status === 'executing' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                      step.status === 'failed' ? 'bg-red-100 text-red-700 border-red-300' :
                      'bg-gray-100 text-gray-600 border-gray-300'
                    }`}
                  >
                    {step.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-white/60 text-gray-700 border-gray-300">
                    {getToolIcon(step.tool)} {step.tool.replace('execute_', '')}
                  </Badge>
                </div>
              </div>
              
              {step.status === 'executing' && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI is processing this step...
                </div>
              )}
              
              {step.status === 'failed' && step.error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  <strong>Error:</strong> {step.error}
                </div>
              )}
              
              {step.status === 'completed' && step.endTime && step.startTime && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Completed in {Math.round((new Date(step.endTime).getTime() - new Date(step.startTime).getTime()) / 1000)}s
                </div>
              )}
              
              {step.reasoning && (
                <div className="text-sm text-purple-600 mt-2 italic bg-purple-50 p-2 rounded-lg border border-purple-200">
                  <Brain className="h-4 w-4 inline mr-1" />
                  AI reasoning: {step.reasoning}
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
