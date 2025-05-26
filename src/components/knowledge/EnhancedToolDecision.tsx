
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Search, Github, Database, MessageCircle, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

export interface EnhancedToolDecision {
  shouldUseTools: boolean;
  detectedType: 'search' | 'github' | 'knowledge' | 'general' | 'none';
  reasoning: string;
  confidence: number;
  suggestedTools: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedSteps: number;
  fallbackStrategy?: string;
}

interface EnhancedToolDecisionDisplayProps {
  decision: EnhancedToolDecision;
  isExecuting?: boolean;
  currentStep?: number;
}

const EnhancedToolDecisionDisplay: React.FC<EnhancedToolDecisionDisplayProps> = ({ 
  decision, 
  isExecuting = false,
  currentStep = 0
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'github':
        return <Github className="h-4 w-4 text-purple-500" />;
      case 'search':
        return <Search className="h-4 w-4 text-blue-500" />;
      case 'knowledge':
        return <Database className="h-4 w-4 text-green-500" />;
      case 'general':
        return <MessageCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Brain className="h-4 w-4 text-orange-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple':
        return 'bg-green-100 text-green-700';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-700';
      case 'complex':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const progressPercentage = decision.estimatedSteps > 0 
    ? Math.min(100, (currentStep / decision.estimatedSteps) * 100)
    : 0;

  return (
    <Card className="mt-3 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span>AI Decision Analysis</span>
            {isExecuting && <Zap className="h-3 w-3 text-blue-500 animate-pulse" />}
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${getConfidenceColor(decision.confidence)}`}
            >
              {Math.round(decision.confidence * 100)}% confidence
            </Badge>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getComplexityColor(decision.complexity)}`}
            >
              {decision.complexity}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Request Analysis */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {getTypeIcon(decision.detectedType)}
            <span className="font-medium text-sm">Request Type:</span>
            <span className="capitalize text-sm">{decision.detectedType}</span>
            {decision.shouldUseTools ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Tools Required
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                No Tools Needed
              </Badge>
            )}
          </div>
          
          <div className="text-sm">
            <span className="font-medium">Reasoning:</span>
            <p className="text-muted-foreground mt-1">{decision.reasoning}</p>
          </div>
        </div>

        {/* Execution Plan */}
        {decision.shouldUseTools && decision.suggestedTools.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Execution Plan:</span>
              <Badge variant="outline" className="text-xs">
                {decision.estimatedSteps} steps
              </Badge>
            </div>
            
            {isExecuting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Step {currentStep} of {decision.estimatedSteps}</span>
                  <span>{Math.round(progressPercentage)}% complete</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}
            
            <div className="flex flex-wrap gap-1">
              {decision.suggestedTools.map((tool, index) => (
                <Badge 
                  key={index} 
                  variant={currentStep > index ? "default" : "secondary"} 
                  className="text-xs"
                >
                  {currentStep === index + 1 && isExecuting && (
                    <Zap className="h-3 w-3 mr-1 animate-pulse" />
                  )}
                  {currentStep > index && <CheckCircle className="h-3 w-3 mr-1" />}
                  {tool.replace('execute_', '')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Fallback Strategy */}
        {decision.fallbackStrategy && (
          <div className="p-2 rounded bg-yellow-50 border border-yellow-200">
            <div className="flex items-center gap-1 text-xs font-medium text-yellow-700 mb-1">
              <XCircle className="h-3 w-3" />
              Fallback Strategy
            </div>
            <p className="text-xs text-yellow-600">{decision.fallbackStrategy}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedToolDecisionDisplay;
