
import React, { useState } from 'react';
import { ArrowRight, Brain, CheckCircle, AlertCircle, LightbulbIcon, Play, Pause, Globe } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { LearningStep } from '../types/intelligence';
import { useLoopStore } from '../store/useLoopStore';
import { toast } from '@/components/ui/sonner';
import ExternalSources from './ExternalSources';

const LearningLoop: React.FC<{ domain: any }> = ({ domain }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showingSources, setShowingSources] = useState<boolean>(false);
  
  const { 
    isRunningLoop, 
    currentStepIndex, 
    startNewLoop, 
    advanceToNextStep,
    completeLoop,
    loadPreviousLoop,
    isContinuousMode,
    toggleContinuousMode,
    loopDelay,
    setLoopDelay
  } = useLoopStore();
  
  const steps: LearningStep[] = domain.currentLoop;
  
  // Function to extract external sources from step metadata if available
  const getExternalSources = (step: LearningStep) => {
    if (step?.metrics?.externalSources && Array.isArray(step.metrics.externalSources)) {
      return step.metrics.externalSources;
    }
    return [];
  };
  
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
  
  const toggleExpand = (index: number) => {
    if (expanded === index) {
      setExpanded(null);
    } else {
      setExpanded(index);
    }
  };
  
  const handleStartLoop = async () => {
    try {
      await startNewLoop();
      toast.success("New learning loop started");
    } catch (error) {
      toast.error("Error starting loop");
    }
  };
  
  const handleNextStep = async () => {
    try {
      await advanceToNextStep();
      toast.success("Advanced to next step");
    } catch (error) {
      toast.error("Error advancing step");
    }
  };
  
  const handlePreviousLoop = () => {
    loadPreviousLoop();
    toast.info("Loading previous loop");
  };
  
  // Determine if we can advance to the next step within the current loop
  const canAdvanceStep = isRunningLoop && 
    currentStepIndex !== null && 
    steps[currentStepIndex]?.status !== 'pending' && 
    steps.length < 5;
  
  // Determine if we should show the "Next Loop" button
  const showNextLoop = !isRunningLoop || 
    (steps.length === 5 && steps[4]?.status !== 'pending');
  
  const toggleSources = () => {
    setShowingSources(!showingSources);
  };

  // Check if a step has valid external sources
  const hasExternalSources = (step: LearningStep): boolean => {
    return !!step.metrics?.externalSources && 
           Array.isArray(step.metrics.externalSources) && 
           step.metrics.externalSources.length > 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Current Learning Loop</h3>
        <div className="space-x-2">
          <Button 
            variant={isContinuousMode ? "default" : "outline"}
            size="sm"
            onClick={toggleContinuousMode}
            className="gap-1"
          >
            {isContinuousMode ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Auto</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Auto</span>
              </>
            )}
          </Button>
          
          {canAdvanceStep && !isContinuousMode && (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleNextStep}
            >
              Next Step
            </Button>
          )}
          
          {showNextLoop && !isContinuousMode && (
            <Button 
              variant="default" 
              size="sm"
              onClick={handleStartLoop}
              disabled={isRunningLoop && !steps.some(step => step.type === 'mutation' && step.status !== 'pending')}
            >
              {isRunningLoop ? "Complete & New Loop" : "Next Loop"}
            </Button>
          )}
        </div>
      </div>
      
      {/* Auto-run settings */}
      {isContinuousMode && (
        <Card className="bg-secondary/30">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="w-1/2">
                <div className="text-sm font-medium mb-1">Loop Delay: {loopDelay}ms</div>
                <Slider
                  value={[loopDelay]}
                  min={500}
                  max={5000}
                  step={500}
                  onValueChange={(values) => setLoopDelay(values[0])}
                  className="w-full"
                />
              </div>
              <div className="space-x-2">
                <Badge variant={isContinuousMode ? "default" : "secondary"} className="animate-pulse">
                  Auto Running
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Loop #{domain.totalLoops}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* External Knowledge toggle */}
      {domain.id === 'web-knowledge' && (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleSources}
            className="flex items-center gap-1"
          >
            <Globe className="h-4 w-4" />
            {showingSources ? 'Hide External Sources' : 'Show External Sources'}
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Using external knowledge for enhanced learning
          </span>
        </div>
      )}
      
      <div className="relative">
        {steps.map((step, index) => (
          <div key={index} className="mb-6 relative">
            {index < steps.length - 1 && (
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
              
              {(expanded === index) && (
                <CardContent>
                  <div className="bg-secondary/50 p-3 rounded-md mt-2">
                    <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground">
                      {step.content}
                    </pre>
                  </div>
                  
                  {/* Display external sources if available and sources toggle is on */}
                  {showingSources && hasExternalSources(step) && (
                    <ExternalSources 
                      sources={getExternalSources(step)}
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
                  onClick={() => toggleExpand(index)}
                >
                  {expanded === index ? 'Hide Details' : 'Show Details'}
                </Button>
                
                {/* Show "Has External Sources" badge if sources are available */}
                {hasExternalSources(step) && (
                  <Badge variant="outline" className="ml-2 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {getExternalSources(step).length} {getExternalSources(step).length === 1 ? 'Source' : 'Sources'}
                  </Badge>
                )}
              </CardFooter>
            </Card>
          </div>
        ))}
        
        {steps.length === 0 && (
          <Card className="border-dashed border-2 p-8 flex flex-col items-center justify-center">
            <div className="text-muted-foreground text-center">
              <Brain className="w-10 h-10 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Learning Loop Active</h3>
              <p className="mb-4">Start a new learning loop to begin the intelligence cycle</p>
              <Button onClick={handleStartLoop}>Start New Loop</Button>
            </div>
          </Card>
        )}
      </div>
      
      <div className="flex gap-2 pt-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handlePreviousLoop}
        >
          Previous Loop
        </Button>
        <Button 
          variant="default" 
          size="sm"
          onClick={handleStartLoop}
          disabled={(isRunningLoop && !steps.some(step => step.type === 'mutation' && step.status !== 'pending')) || isContinuousMode}
        >
          Next Loop
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">Loop #{domain.totalLoops} of {domain.totalLoops}</span>
      </div>
    </div>
  );
};

export default LearningLoop;
