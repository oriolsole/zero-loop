
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, Loader2, Brain, Zap, Eye, ArrowRight, Lightbulb } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DynamicExecutionPlan, DynamicPlanStep } from '@/hooks/useDynamicPlanOrchestrator';

interface PlanExecutionProgressProps {
  plan: DynamicExecutionPlan;
  progress: { current: number; total: number; percentage: number };
  onFollowUpAction?: (action: string) => void;
}

const PlanExecutionProgress: React.FC<PlanExecutionProgressProps> = ({ 
  plan, 
  progress, 
  onFollowUpAction 
}) => {
  const [expandedSteps, setExpandedSteps] = React.useState<Set<string>>(new Set());

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

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
            className={`rounded-xl border-2 transition-all duration-300 ${getStepStatusStyle(step)}`}
          >
            <div className="flex items-center gap-4 p-4">
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
                    {(step.extractedContent || step.aiInsight) && (
                      <button
                        onClick={() => toggleStepExpansion(step.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View Details
                      </button>
                    )}
                  </div>
                </div>
                
                {/* AI Progress Update */}
                {step.status === 'executing' && step.progressUpdate && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="italic">{step.progressUpdate}</span>
                  </div>
                )}
                
                {/* AI Insight */}
                {step.status === 'completed' && step.aiInsight && (
                  <div className="flex items-start gap-2 text-sm text-purple-600 mb-2">
                    <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="italic">{step.aiInsight}</span>
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
            
            {/* Collapsible Details */}
            {(step.extractedContent || step.aiInsight) && (
              <Collapsible open={expandedSteps.has(step.id)}>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="bg-white/80 rounded-lg p-3 border border-gray-200">
                    {step.extractedContent && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-500 mb-2">Extracted Content:</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {step.extractedContent.length > 1000 
                            ? `${step.extractedContent.substring(0, 1000)}...` 
                            : step.extractedContent}
                        </div>
                      </div>
                    )}
                    {step.aiInsight && (
                      <div>
                        <div className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          AI Analysis:
                        </div>
                        <div className="text-sm text-purple-700 italic">
                          {step.aiInsight}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        ))}
        
        {/* Follow-up Suggestions */}
        {plan.status === 'completed' && plan.followUpSuggestions && plan.followUpSuggestions.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="h-5 w-5 text-indigo-600" />
              <span className="font-semibold text-indigo-800">What's next?</span>
            </div>
            <div className="space-y-2">
              {plan.followUpSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onFollowUpAction?.(suggestion)}
                  className="mr-2 mb-2 bg-white/60 hover:bg-white border-indigo-300 text-indigo-700 hover:text-indigo-800"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlanExecutionProgress;
