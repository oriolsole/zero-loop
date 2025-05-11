
import React, { useState } from 'react';
import { Brain, ArrowRight, CheckCircle, AlertCircle, LightbulbIcon, Globe } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LearningStep } from '../../types/intelligence';
import ExternalSources, { ExternalSource } from '../ExternalSources';

interface StepProps {
  step: LearningStep;
  index: number;
  currentStepIndex: number | null;
  showingSources: boolean;
}

const Step: React.FC<StepProps> = ({ step, index, currentStepIndex, showingSources }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-success text-success-foreground';
      case 'failure': return 'bg-destructive text-destructive-foreground';
      case 'pending': return 'bg-muted text-muted-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };
  
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'task': return <Brain className="w-5 h-5" />;
      case 'solution': return <ArrowRight className="w-5 h-5" />;
      case 'verification': return <CheckCircle className="w-5 h-5" />;
      case 'reflection': return <AlertCircle className="w-5 h-5" />;
      case 'mutation': return <LightbulbIcon className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  // Check if a step has valid external sources
  const hasExternalSources = (): boolean => {
    return !!step.metrics?.externalSources && 
           Array.isArray(step.metrics.externalSources) && 
           step.metrics.externalSources.length > 0;
  };
  
  // Function to get external sources from step metadata if available
  const getExternalSources = (): ExternalSource[] => {
    if (step?.metrics?.externalSources && Array.isArray(step.metrics.externalSources)) {
      return step.metrics.externalSources;
    }
    return [];
  };

  return (
    <div className="mb-6 relative">
      {index < 4 && (
        <div className={`connector absolute left-6 top-12 w-0.5 h-12 bg-border ${currentStepIndex && currentStepIndex > index ? 'bg-primary' : ''}`} />
      )}
      
      <Card className={`border-l-4 ${getStatusColor(step.status)}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${step.status === 'pending' ? 'bg-muted' : step.status === 'success' ? 'bg-success/20' : step.status === 'failure' ? 'bg-destructive/20' : 'bg-warning/20'}`}>
                {getStepIcon(step.type)}
              </div>
              <div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </div>
            </div>
            <Badge variant={step.status === 'success' ? 'default' : 'secondary'}>
              {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        
        {expanded && (
          <CardContent>
            <div className="bg-secondary/50 p-3 rounded-md mt-2">
              <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground">
                {step.content}
              </pre>
            </div>
            
            {/* Display external sources if available and sources toggle is on */}
            {showingSources && hasExternalSources() && (
              <ExternalSources 
                sources={getExternalSources()}
                title={`External Sources for ${step.title}`}
                description="Information used to support this step"
              />
            )}
            
            {step.metrics && Object.keys(step.metrics).length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {Object.entries(step.metrics)
                  .filter(([key]) => key !== 'externalSources') // Skip showing external sources here
                  .map(([key, value]) => (
                    <div key={key} className="bg-secondary/30 p-2 rounded">
                      <div className="text-xs text-muted-foreground">{key}</div>
                      <div className="font-medium">{value.toString()}</div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        )}
        
        <CardFooter className="pt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleExpand}
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </Button>
          
          {/* Show "Has External Sources" badge if sources are available */}
          {hasExternalSources() && (
            <Badge variant="outline" className="ml-2 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {getExternalSources().length} {getExternalSources().length === 1 ? 'Source' : 'Sources'}
            </Badge>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Step;
