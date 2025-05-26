
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { LearningStep, LoopHistory } from '../../types/intelligence';
import { domainEngines } from '../../engines/domainEngines';
import { logLoopToSupabase } from '../../utils/supabase/loopOperations';
import { getModelSettings } from '../../services/modelProviderService';

export interface LoopActions {
  startNewLoop: () => Promise<void>;
  advanceToNextStep: () => Promise<void>;
  completeLoop: () => void;
  cancelCurrentLoop: () => void;
  loadPreviousLoop: (loopId?: string) => void;
  toggleContinuousMode: () => void;
  setLoopDelay: (delay: number) => void;
  pauseLoops: () => void;
}

export const createLoopActions: StateCreator<any, [], [], LoopActions> = (set, get) => ({
  startNewLoop: async () => {
    const { domains, activeDomainId, isContinuousMode } = get();
    const activeDomain = domains.find((d: any) => d.id === activeDomainId);
    
    if (!activeDomain || !activeDomain.engine) {
      console.error('No active domain or engine selected');
      return;
    }

    // Get current global model settings
    const modelSettings = getModelSettings();
    console.log('Starting new loop with model settings:', modelSettings);

    const engine = domainEngines[activeDomain.engine];
    if (!engine) {
      console.error('Domain engine not found:', activeDomain.engine);
      return;
    }

    const loopId = uuidv4();
    const createdAt = new Date().toISOString();
    
    try {
      // Pass model settings to the task generation
      const taskResult = await engine.generateTask(activeDomain, { modelSettings });
      
      if (typeof taskResult === 'string') {
        // Handle simple string response
        const initialStep: LearningStep = {
          id: uuidv4(),
          type: 'task',
          title: 'Task Generation',
          content: taskResult,
          isCompleted: true,
          result: { task: taskResult, success: true }
        };

        set({
          isRunningLoop: true,
          currentStepIndex: 0,
          loopHistory: [{
            id: loopId,
            domainId: activeDomainId,
            domainName: activeDomain.name,
            steps: [initialStep],
            startTime: createdAt,
            isCompleted: false,
            status: 'active'
          }, ...get().loopHistory]
        });
      } else {
        console.error('Invalid task generation result');
        return;
      }

      // Auto-advance if in continuous mode
      if (isContinuousMode) {
        setTimeout(() => {
          const state = get();
          if (state.isRunningLoop) {
            state.advanceToNextStep();
          }
        }, get().loopDelay);
      }

    } catch (error) {
      console.error('Error starting new loop:', error);
      set({ isRunningLoop: false, currentStepIndex: null });
    }
  },

  advanceToNextStep: async () => {
    const { 
      domains, 
      activeDomainId, 
      loopHistory, 
      currentStepIndex, 
      isContinuousMode,
      useRemoteLogging
    } = get();
    
    const activeDomain = domains.find((d: any) => d.id === activeDomainId);
    const currentLoop = loopHistory[0];
    
    if (!activeDomain || !currentLoop || currentStepIndex === null) {
      console.error('Cannot advance step: missing domain or loop');
      return;
    }

    const engine = domainEngines[activeDomain.engine];
    if (!engine) {
      console.error('Domain engine not found:', activeDomain.engine);
      return;
    }

    const nextStepIndex = currentStepIndex + 1;
    const stepTypes: LearningStep['type'][] = ['task', 'solution', 'verification', 'reflection', 'mutation'];
    
    if (nextStepIndex >= stepTypes.length) {
      get().completeLoop();
      return;
    }

    // Get current global model settings for each step
    const modelSettings = getModelSettings();

    const stepType = stepTypes[nextStepIndex];
    
    try {
      let result;
      const context = { 
        previousSteps: currentLoop.steps,
        domain: activeDomain,
        modelSettings // Pass current model settings to each step
      };

      switch (stepType) {
        case 'solution':
          // Use solveTask method from DomainEngine interface
          const taskContent = currentLoop.steps[0].result?.task || currentLoop.steps[0].content;
          result = await engine.solveTask(taskContent, context);
          break;
        case 'verification':
          // Use verifyTask or verifySolution method
          const solutionContent = currentLoop.steps[1].result?.solution || currentLoop.steps[1].content;
          if (engine.verifyTask) {
            result = await engine.verifyTask(taskContent, solutionContent);
          } else if (engine.verifySolution) {
            result = await engine.verifySolution(taskContent, solutionContent, activeDomain.id);
          } else {
            result = { result: true, explanation: 'No verification available', score: 1 };
          }
          break;
        case 'reflection':
          // Use reflect or reflectOnTask method
          const verificationResult = currentLoop.steps[2].result || { result: true };
          if (engine.reflectOnTask) {
            result = await engine.reflectOnTask(taskContent, solutionContent, verificationResult);
          } else if (engine.reflect) {
            result = await engine.reflect(taskContent, solutionContent, verificationResult, activeDomain.id);
          } else {
            result = { reflection: 'No reflection available', insights: [] };
          }
          break;
        case 'mutation':
          // Use mutateTask method
          const reflectionResult = currentLoop.steps[3].result || { insights: [] };
          if (engine.mutateTask) {
            result = await engine.mutateTask(taskContent, solutionContent, verificationResult, reflectionResult);
          } else {
            result = taskContent; // Fallback to original task
          }
          break;
        default:
          console.error('Unknown step type:', stepType);
          return;
      }

      const newStep: LearningStep = {
        id: uuidv4(),
        type: stepType,
        title: stepType.charAt(0).toUpperCase() + stepType.slice(1),
        content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        isCompleted: true,
        result
      };

      const updatedLoop = {
        ...currentLoop,
        steps: [...currentLoop.steps, newStep]
      };

      set({
        currentStepIndex: nextStepIndex,
        loopHistory: [updatedLoop, ...loopHistory.slice(1)]
      });

      // Auto-advance if in continuous mode and not the last step
      if (isContinuousMode && nextStepIndex < stepTypes.length - 1) {
        setTimeout(() => {
          const state = get();
          if (state.isRunningLoop) {
            state.advanceToNextStep();
          }
        }, get().loopDelay);
      }

    } catch (error) {
      console.error(`Error in ${stepType} step:`, error);
    }
  },

  completeLoop: () => {
    const { loopHistory, useRemoteLogging } = get();
    const currentLoop = loopHistory[0];
    
    if (!currentLoop) return;

    const completedLoop: LoopHistory = {
      ...currentLoop,
      endTime: new Date().toISOString(),
      isCompleted: true,
      status: 'completed'
    };

    set({
      isRunningLoop: false,
      currentStepIndex: null,
      loopHistory: [completedLoop, ...loopHistory.slice(1)]
    });

    // Save to Supabase if remote logging is enabled
    if (useRemoteLogging) {
      logLoopToSupabase(completedLoop).catch(error => {
        console.error('Error saving completed loop to Supabase:', error);
      });
    }

    console.log('Loop completed:', completedLoop.id);
  },

  cancelCurrentLoop: () => {
    set({
      isRunningLoop: false,
      currentStepIndex: null
    });
  },

  loadPreviousLoop: (loopId?: string) => {
    const { loopHistory } = get();
    
    let loopToLoad;
    if (loopId) {
      loopToLoad = loopHistory.find(loop => loop.id === loopId);
    } else {
      loopToLoad = loopHistory.find(loop => loop.isCompleted);
    }
    
    if (!loopToLoad) {
      console.error('No previous loop found to load');
      return;
    }

    set({
      currentStepIndex: loopToLoad.steps.length - 1,
      isRunningLoop: false,
      loopHistory: [loopToLoad, ...loopHistory.filter(loop => loop.id !== loopToLoad.id)]
    });
  },

  toggleContinuousMode: () => {
    set(state => ({ isContinuousMode: !state.isContinuousMode }));
  },

  setLoopDelay: (delay: number) => {
    set({ loopDelay: delay });
  },

  pauseLoops: () => {
    set({ 
      isRunningLoop: false, 
      isContinuousMode: false 
    });
  }
});
