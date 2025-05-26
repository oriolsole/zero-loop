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
    console.log('=== START NEW LOOP ===');
    const { domains, activeDomainId, isContinuousMode } = get();
    
    console.log('Current state:', {
      domainsCount: domains.length,
      activeDomainId,
      domains: domains.map(d => ({ id: d.id, name: d.name, engine: d.engine }))
    });
    
    const activeDomain = domains.find((d: any) => d.id === activeDomainId);
    
    if (!activeDomain) {
      console.error('No active domain found. Available domains:', domains);
      return;
    }
    
    if (!activeDomain.engine) {
      console.error('Active domain has no engine specified:', activeDomain);
      return;
    }

    console.log('Active domain:', {
      id: activeDomain.id,
      name: activeDomain.name,
      engine: activeDomain.engine
    });

    // Get current global model settings
    const modelSettings = getModelSettings();
    console.log('Starting new loop with model settings:', modelSettings);

    const engine = domainEngines[activeDomain.engine];
    if (!engine) {
      console.error('Domain engine not found:', activeDomain.engine);
      console.error('Available engines:', Object.keys(domainEngines));
      return;
    }

    console.log('Found engine for domain:', activeDomain.engine);

    const loopId = uuidv4();
    const createdAt = new Date().toISOString();
    
    try {
      console.log('Generating task with engine...');
      // Pass model settings to the task generation
      const taskResult = await engine.generateTask(activeDomain, { modelSettings });
      console.log('Task generation result:', taskResult);
      
      if (typeof taskResult === 'string') {
        // Handle simple string response
        const initialStep: LearningStep = {
          id: uuidv4(),
          type: 'task',
          title: 'Task Generation',
          content: taskResult,
          status: 'success',
          isCompleted: true,
          result: { task: taskResult, success: true }
        };

        // Update domain's currentLoop instead of loopHistory
        const updatedDomains = domains.map((domain: any) => {
          if (domain.id === activeDomainId) {
            return {
              ...domain,
              currentLoop: [initialStep]
            };
          }
          return domain;
        });

        // Also add to loop history for tracking
        const newLoopHistory: LoopHistory = {
          id: loopId,
          domainId: activeDomainId,
          domainName: activeDomain.name,
          steps: [initialStep],
          startTime: createdAt,
          isCompleted: false,
          status: 'active'
        };

        set({
          domains: updatedDomains,
          isRunningLoop: true,
          currentStepIndex: 0,
          loopHistory: [newLoopHistory, ...get().loopHistory]
        });

        console.log('Loop started successfully with initial step');

        // Auto-advance if in continuous mode
        if (isContinuousMode) {
          setTimeout(() => {
            const state = get();
            if (state.isRunningLoop) {
              state.advanceToNextStep();
            }
          }, get().loopDelay);
        }
      } else {
        console.error('Invalid task generation result:', taskResult);
        return;
      }

    } catch (error) {
      console.error('Error starting new loop:', error);
      set({ isRunningLoop: false, currentStepIndex: null });
    }
  },

  advanceToNextStep: async () => {
    console.log('=== ADVANCE TO NEXT STEP ===');
    const { 
      domains, 
      activeDomainId, 
      loopHistory, 
      currentStepIndex, 
      isContinuousMode,
      useRemoteLogging
    } = get();
    
    const activeDomain = domains.find((d: any) => d.id === activeDomainId);
    const currentLoop = activeDomain?.currentLoop || [];
    
    console.log('Current loop state:', {
      activeDomainId,
      currentStepIndex,
      currentLoopLength: currentLoop.length,
      steps: currentLoop.map(s => ({ type: s.type, status: s.status }))
    });
    
    if (!activeDomain || currentLoop.length === 0) {
      console.error('Cannot advance step: missing domain or current loop');
      return;
    }

    const engine = domainEngines[activeDomain.engine];
    if (!engine) {
      console.error('Domain engine not found:', activeDomain.engine);
      return;
    }

    const nextStepIndex = (currentStepIndex || 0) + 1;
    const stepTypes: LearningStep['type'][] = ['task', 'solution', 'verification', 'reflection', 'mutation'];
    
    if (nextStepIndex >= stepTypes.length) {
      console.log('All steps completed, finishing loop');
      get().completeLoop();
      return;
    }

    // Get current global model settings for each step
    const modelSettings = getModelSettings();
    const stepType = stepTypes[nextStepIndex];
    
    console.log(`Executing step: ${stepType} (index: ${nextStepIndex})`);
    
    try {
      let result;
      const context = { 
        previousSteps: currentLoop,
        domain: activeDomain,
        modelSettings // Pass current model settings to each step
      };

      const taskContent = currentLoop[0].result?.task || currentLoop[0].content;
      
      switch (stepType) {
        case 'solution':
          console.log('Solving task:', taskContent);
          result = await engine.solveTask(taskContent, context);
          break;
        case 'verification':
          const solutionContent = currentLoop[1].result?.solution || currentLoop[1].content;
          console.log('Verifying solution:', solutionContent);
          if (engine.verifyTask) {
            result = await engine.verifyTask(taskContent, solutionContent);
          } else if (engine.verifySolution) {
            result = await engine.verifySolution(taskContent, solutionContent, activeDomain.id);
          } else {
            result = { result: true, explanation: 'No verification available', score: 1 };
          }
          break;
        case 'reflection':
          const verificationResult = currentLoop[2].result || { result: true };
          console.log('Reflecting on task with verification:', verificationResult);
          if (engine.reflectOnTask) {
            result = await engine.reflectOnTask(taskContent, solutionContent, verificationResult);
          } else if (engine.reflect) {
            result = await engine.reflect(taskContent, solutionContent, verificationResult, activeDomain.id);
          } else {
            result = { reflection: 'No reflection available', insights: [] };
          }
          break;
        case 'mutation':
          const reflectionResult = currentLoop[3].result || { insights: [] };
          console.log('Mutating task with reflection:', reflectionResult);
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

      console.log(`Step ${stepType} result:`, result);

      const newStep: LearningStep = {
        id: uuidv4(),
        type: stepType,
        title: stepType.charAt(0).toUpperCase() + stepType.slice(1),
        content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        status: 'success',
        isCompleted: true,
        result
      };

      // Update domain's currentLoop
      const updatedDomains = domains.map((domain: any) => {
        if (domain.id === activeDomainId) {
          return {
            ...domain,
            currentLoop: [...currentLoop, newStep]
          };
        }
        return domain;
      });

      // Update loop history
      const updatedLoopHistory = loopHistory.map(loop => {
        if (loop.domainId === activeDomainId && loop.status === 'active') {
          return {
            ...loop,
            steps: [...currentLoop, newStep]
          };
        }
        return loop;
      });

      set({
        domains: updatedDomains,
        currentStepIndex: nextStepIndex,
        loopHistory: updatedLoopHistory
      });

      console.log(`Step ${stepType} completed successfully`);

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
      
      // Create a failed step
      const failedStep: LearningStep = {
        id: uuidv4(),
        type: stepType,
        title: stepType.charAt(0).toUpperCase() + stepType.slice(1),
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failure',
        isCompleted: true,
        result: { error: error instanceof Error ? error.message : 'Unknown error' }
      };

      // Update domain with failed step
      const updatedDomains = domains.map((domain: any) => {
        if (domain.id === activeDomainId) {
          return {
            ...domain,
            currentLoop: [...currentLoop, failedStep]
          };
        }
        return domain;
      });

      set({
        domains: updatedDomains,
        currentStepIndex: nextStepIndex
      });
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
