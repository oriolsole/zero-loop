import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { LearningStep, LoopHistory } from '../../types/intelligence';
import { domainEngines } from '../../engines/domainEngines';
import { saveLoopToSupabase } from '../../utils/supabase/loopOperations';
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
      
      if (!taskResult.success) {
        console.error('Failed to generate task:', taskResult.error);
        return;
      }

      const initialStep: LearningStep = {
        id: uuidv4(),
        type: 'task',
        title: 'Task Generation',
        content: taskResult.task || '',
        timestamp: new Date().toISOString(),
        isCompleted: true,
        result: taskResult
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
          modelSettings // Store which model settings were used
        }, ...get().loopHistory]
      });

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
    const timestamp = new Date().toISOString();
    
    try {
      let result;
      const context = { 
        previousSteps: currentLoop.steps,
        domain: activeDomain,
        modelSettings // Pass current model settings to each step
      };

      switch (stepType) {
        case 'solution':
          result = await engine.generateSolution(currentLoop.steps[0].result?.task || '', context);
          break;
        case 'verification':
          result = await engine.verifySolution(
            currentLoop.steps[0].result?.task || '',
            currentLoop.steps[1].result?.solution || '',
            context
          );
          break;
        case 'reflection':
          result = await engine.generateReflection(currentLoop.steps, context);
          break;
        case 'mutation':
          result = await engine.mutateTask(
            currentLoop.steps[0].result?.task || '',
            currentLoop.steps[3].result?.insights || [],
            context
          );
          break;
        default:
          console.error('Unknown step type:', stepType);
          return;
      }

      if (!result?.success) {
        console.error(`Failed to execute ${stepType} step:`, result?.error);
        return;
      }

      const newStep: LearningStep = {
        id: uuidv4(),
        type: stepType,
        title: stepType.charAt(0).toUpperCase() + stepType.slice(1),
        content: result.content || JSON.stringify(result, null, 2),
        timestamp,
        isCompleted: true,
        result
      };

      const updatedLoop = {
        ...currentLoop,
        steps: [...currentLoop.steps, newStep],
        modelSettings: modelSettings // Update model settings for the loop
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
      isCompleted: true
    };

    set({
      isRunningLoop: false,
      currentStepIndex: null,
      loopHistory: [completedLoop, ...loopHistory.slice(1)]
    });

    // Save to Supabase if remote logging is enabled
    if (useRemoteLogging) {
      saveLoopToSupabase(completedLoop).catch(error => {
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
