
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Brain, 
  Search, 
  Cog, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Zap
} from 'lucide-react';

export type AIPhase = 'analyzing' | 'planning' | 'executing' | 'reflecting' | 'completed' | 'error';

interface ProgressPhaseIndicatorProps {
  currentPhase: AIPhase;
  phaseDetails?: string;
  estimatedTimeRemaining?: number;
  className?: string;
}

const ProgressPhaseIndicator: React.FC<ProgressPhaseIndicatorProps> = ({
  currentPhase,
  phaseDetails,
  estimatedTimeRemaining,
  className = ""
}) => {
  const getPhaseConfig = (phase: AIPhase) => {
    switch (phase) {
      case 'analyzing':
        return {
          icon: <Brain className="h-4 w-4" />,
          label: 'Analyzing Request',
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          description: 'Understanding your request and determining the best approach'
        };
      case 'planning':
        return {
          icon: <Search className="h-4 w-4" />,
          label: 'Planning Execution',
          color: 'bg-purple-100 text-purple-700 border-purple-200',
          description: 'Selecting tools and creating execution strategy'
        };
      case 'executing':
        return {
          icon: <Cog className="h-4 w-4 animate-spin" />,
          label: 'Executing Tools',
          color: 'bg-orange-100 text-orange-700 border-orange-200',
          description: 'Running tools and gathering information'
        };
      case 'reflecting':
        return {
          icon: <Brain className="h-4 w-4" />,
          label: 'Processing Results',
          color: 'bg-green-100 text-green-700 border-green-200',
          description: 'Analyzing results and preparing response'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          label: 'Completed',
          color: 'bg-green-100 text-green-700 border-green-200',
          description: 'Task completed successfully'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          label: 'Error Occurred',
          color: 'bg-red-100 text-red-700 border-red-200',
          description: 'An error occurred, analyzing alternatives'
        };
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          label: 'Processing',
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          description: 'Working on your request'
        };
    }
  };

  const phaseConfig = getPhaseConfig(currentPhase);

  return (
    <Card className={`border-l-4 border-l-blue-500 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50">
              {phaseConfig.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{phaseConfig.label}</span>
                {currentPhase === 'executing' && (
                  <Zap className="h-3 w-3 text-blue-500 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {phaseDetails || phaseConfig.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${phaseConfig.color}`}>
              {currentPhase}
            </Badge>
            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
              <Badge variant="secondary" className="text-xs">
                ~{estimatedTimeRemaining}s
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressPhaseIndicator;
