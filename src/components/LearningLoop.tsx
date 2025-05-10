
import React, { useState } from 'react';
import { ArrowRight, Brain, CheckCircle, AlertCircle, LightbulbIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LearningStep } from '../types/intelligence';

const LearningLoop: React.FC<{ domain: any }> = ({ domain }) => {
  const [activeStep, setActiveStep] = useState<number | null>(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  
  const steps: LearningStep[] = domain.currentLoop;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-success text-success-foreground';
      case 'failure': return 'bg-failure text-failure-foreground';
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
  
  const toggleExpand = (index: number) => {
    if (expanded === index) {
      setExpanded(null);
    } else {
      setExpanded(index);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Current Learning Loop</h3>
        <Button variant="outline" size="sm">View History</Button>
      </div>
      
      <div className="relative">
        {steps.map((step, index) => (
          <div key={index} className="mb-6 relative">
            {index < steps.length - 1 && (
              <div className={`connector left-6 top-12 w-0.5 h-12 ${activeStep && activeStep > index ? 'active' : ''}`} />
            )}
            
            <Card className={`border-l-4 ${getStatusColor(step.status)}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${step.status === 'pending' ? 'bg-muted' : `bg-${step.status}`}`}>
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
              
              {(expanded === index) && (
                <CardContent>
                  <div className="bg-secondary/50 p-3 rounded-md mt-2">
                    <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground">
                      {step.content}
                    </pre>
                  </div>
                  
                  {step.metrics && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {Object.entries(step.metrics).map(([key, value]) => (
                        <div key={key} className="bg-secondary/30 p-2 rounded">
                          <div className="text-xs text-muted-foreground">{key}</div>
                          <div className="font-medium">{value}</div>
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
                  onClick={() => toggleExpand(index)}
                >
                  {expanded === index ? 'Hide Details' : 'Show Details'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2 pt-4">
        <Button variant="outline" size="sm">Previous Loop</Button>
        <Button variant="default" size="sm">Next Loop</Button>
        <span className="ml-auto text-sm text-muted-foreground">Loop #247 of {domain.totalLoops}</span>
      </div>
    </div>
  );
};

export default LearningLoop;
