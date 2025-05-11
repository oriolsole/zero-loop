
import React, { useState } from 'react';
import { toast } from '@/components/ui/sonner';
import { useLoopStore } from '../store/useLoopStore';
import { LearningStep } from '../types/intelligence';

// Import our newly created components
import Step from './learning-loop/Step';
import LoopControls from './learning-loop/LoopControls';
import SourcesToggle from './learning-loop/SourcesToggle';
import EmptyLoopState from './learning-loop/EmptyLoopState';
import LoopNavigation from './learning-loop/LoopNavigation';

const LearningLoop: React.FC<{ domain: any }> = ({ domain }) => {
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
  
  const toggleSources = () => {
    setShowingSources(!showingSources);
  };
  
  // Determine if we can advance to the next step within the current loop
  const canAdvanceStep = isRunningLoop && 
    currentStepIndex !== null && 
    steps[currentStepIndex]?.status !== 'pending' && 
    steps.length < 5;
  
  // Determine if we should show the "Next Loop" button
  const showNextLoop = !isRunningLoop || 
    (steps.length === 5 && steps[4]?.status !== 'pending');
    
  // Check if current domain is web knowledge domain
  const isWebKnowledgeDomain = domain.id === 'web-knowledge';

  return (
    <div className="space-y-6">
      <LoopControls
        isContinuousMode={isContinuousMode}
        canAdvanceStep={canAdvanceStep}
        showNextLoop={showNextLoop}
        isRunningLoop={isRunningLoop}
        loopDelay={loopDelay}
        totalLoops={domain.totalLoops}
        handleNextStep={handleNextStep}
        handleStartLoop={handleStartLoop}
        toggleContinuousMode={toggleContinuousMode}
        setLoopDelay={setLoopDelay}
      />
      
      <SourcesToggle 
        showingSources={showingSources}
        toggleSources={toggleSources}
        isDomainWebKnowledge={isWebKnowledgeDomain}
      />
      
      <div className="relative">
        {steps.map((step, index) => (
          <Step 
            key={index}
            step={step}
            index={index}
            currentStepIndex={currentStepIndex}
            showingSources={showingSources}
          />
        ))}
        
        {steps.length === 0 && (
          <EmptyLoopState handleStartLoop={handleStartLoop} />
        )}
      </div>
      
      <LoopNavigation
        handlePreviousLoop={handlePreviousLoop}
        handleStartLoop={handleStartLoop}
        isRunningLoop={isRunningLoop}
        showNextLoop={showNextLoop}
        isContinuousMode={isContinuousMode}
        totalLoops={domain.totalLoops}
      />
    </div>
  );
};

export default LearningLoop;
