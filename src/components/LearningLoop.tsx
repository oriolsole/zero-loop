
import React, { useState } from 'react';
import { useLoopStore } from '../store/useLoopStore';
import { Card } from "@/components/ui/card";
import Step from './learning-loop/Step';
import LoopControls from './learning-loop/LoopControls';
import SourcesToggle from './learning-loop/SourcesToggle';
import EmptyLoopState from './learning-loop/EmptyLoopState';
import LoopNavigation from './learning-loop/LoopNavigation';
import ExternalSources from './ExternalSources';
import { domainEngines } from '../engines/domainEngines';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';
import { LearningStep, ExternalSource } from '@/types/intelligence';

const LearningLoop: React.FC = () => {
  const { 
    domains, 
    activeDomainId, 
    isRunningLoop,
    startNewLoop, 
    advanceToNextStep, 
    currentStepIndex 
  } = useLoopStore();
  const [showingSources, setShowingSources] = useState(false);
  
  const activeDomain = domains.find(d => d.id === activeDomainId);
  const currentLoop: LearningStep[] = activeDomain?.currentLoop || [];
  const currentStep = currentStepIndex !== null && currentLoop.length > currentStepIndex ? currentLoop[currentStepIndex] : null;
  
  // Check if this domain uses web knowledge capabilities
  const isDomainWebKnowledge = activeDomainId === 'web-knowledge';
  const hasWebKnowledgeEngine = domainEngines[activeDomainId]?.enrichTask !== undefined;
  
  // Check if this domain uses AI reasoning
  const isAIReasoning = activeDomainId === 'ai-reasoning';
  
  // Determine sources to show from the current step's metadata
  const currentStepSources: ExternalSource[] = currentStep?.metadata?.sources || [];
  
  // Check if the first step is still being generated
  const isTaskGenerating = currentLoop.length > 0 && currentLoop[0].status === 'pending';
  
  const handleToggleSources = () => {
    setShowingSources(prev => !prev);
  };

  const handleStartLoop = async () => {
    try {
      await startNewLoop();
    } catch (error) {
      console.error("Error starting loop:", error);
    }
  };

  if (!activeDomain) {
    return <div>No active domain selected</div>;
  }

  if (!isRunningLoop || currentLoop.length === 0) {
    return (
      <EmptyLoopState 
        handleStartLoop={handleStartLoop} 
        isDomainWebKnowledge={isDomainWebKnowledge || hasWebKnowledgeEngine}
        isAIReasoning={isAIReasoning}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {isAIReasoning ? (
            <span className="flex items-center">
              AI-Powered Learning Loop
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                AI
              </span>
            </span>
          ) : (
            "Learning Loop"
          )}
        </h2>
        
        <SourcesToggle 
          showingSources={showingSources}
          toggleSources={handleToggleSources}
          isDomainWebKnowledge={isDomainWebKnowledge || hasWebKnowledgeEngine}
          sourceCount={currentStepSources.length}
        />
      </div>
      
      {isTaskGenerating && (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin mr-2" />
          <AlertDescription className="text-blue-700">
            Generating your learning task... The "Next Step" button will be enabled once it's ready.
          </AlertDescription>
        </Alert>
      )}
      
      <LoopNavigation 
        steps={currentLoop} 
        currentStepIndex={currentStepIndex}
      />
      
      <Card className="p-6">
        {currentLoop.map((step, index) => (
          <Step 
            key={index} 
            step={step} 
            isActive={index === currentStepIndex} 
            stepNumber={index + 1}
          />
        ))}
      </Card>
      
      {showingSources && currentStepSources.length > 0 && (
        <ExternalSources 
          sources={currentStepSources}
          title={`External Sources for ${currentStep?.title || 'Current Step'}`}
        />
      )}
      
      <LoopControls 
        isLastStep={currentStepIndex === currentLoop.length - 1}
        onAdvance={advanceToNextStep}
        currentStep={currentStep}
      />
    </div>
  );
};

export default LearningLoop;
