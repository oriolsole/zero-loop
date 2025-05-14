import { LearningStep, LoopHistory } from '../../types/intelligence';
import { LoopState } from '../useLoopStore';
import { domainEngines } from '../../engines/domainEngines';
import { extractInsightsFromReflection } from '../../utils/knowledgeGraph';
import { toast } from '@/components/ui/sonner';
import { v4 as uuidv4 } from 'uuid';

type SetFunction = (
  partial: LoopState | Partial<LoopState> | ((state: LoopState) => LoopState | Partial<LoopState>),
  replace?: boolean,
) => void;

type GetFunction = () => LoopState;

export const createLoopActions = (
  set: SetFunction,
  get: GetFunction
) => ({
  startNewLoop: async () => {
    const { domains, activeDomainId } = get();
    const activeDomainIndex = domains.findIndex(d => d.id === activeDomainId);
    
    if (activeDomainIndex === -1) return;
    
    // Create initial step with pending status
    const initialStep: LearningStep = {
      id: uuidv4(), // Add unique ID for the step
      type: 'task',
      title: 'Task Generation',
      description: 'Generating a new task...',
      status: 'pending',
      content: ''
    };
    
    // Clone current domain
    const updatedDomains = [...domains];
    const currentDomain = { ...updatedDomains[activeDomainIndex] };
    
    // Set up new loop with pending task
    currentDomain.currentLoop = [initialStep];
    updatedDomains[activeDomainIndex] = currentDomain;
    
    set({ domains: updatedDomains, isRunningLoop: true, currentStepIndex: 0 });
    
    // Generate the task using domain engine
    try {
      const engine = domainEngines[activeDomainId] || domainEngines[Object.keys(domainEngines)[0]];
      const taskContent = await engine.generateTask(activeDomainId);
      
      // Handle both string and complex object responses
      // Fix TypeScript errors by properly checking the type
      let content = '';
      let metadata = undefined;
      
      if (taskContent !== null && taskContent !== undefined) {
        if (typeof taskContent === 'string') {
          content = taskContent;
        } else if (typeof taskContent === 'object') {
          // Add proper type assertions to avoid 'never' type errors
          const taskObj = taskContent as { content?: string; metadata?: any };
          content = taskObj.content !== undefined ? String(taskObj.content) : '';
          metadata = taskObj.metadata;
        }
      }
      
      const updatedStep: LearningStep = {
        ...initialStep,
        status: 'success',
        content,
        metadata,
        title: 'Task',
        description: 'A new problem to solve'
      };
      
      // Update domain with generated task
      const newDomains = [...get().domains];
      const domain = { ...newDomains[activeDomainIndex] };
      domain.currentLoop = [updatedStep];
      newDomains[activeDomainIndex] = domain;
      
      set({ domains: newDomains });
      
      // If in continuous mode, automatically go to the next step after delay
      if (get().isContinuousMode) {
        setTimeout(() => {
          const currentState = get();
          if (currentState.isContinuousMode && currentState.isRunningLoop) {
            get().advanceToNextStep();
          }
        }, get().loopDelay);
      }
    } catch (error) {
      // Handle error in task generation
      const updatedStep: LearningStep = {
        ...initialStep,
        status: 'failure',
        content: `Error generating task: ${error}`,
        title: 'Task Generation Failed',
        description: 'An error occurred while generating the task'
      };
      
      const newDomains = [...get().domains];
      const domain = { ...newDomains[activeDomainIndex] };
      domain.currentLoop = [updatedStep];
      newDomains[activeDomainIndex] = domain;
      
      set({ domains: newDomains });
    }
  },
  
  advanceToNextStep: async () => {
    const { domains, activeDomainId, currentStepIndex } = get();
    const activeDomainIndex = domains.findIndex(d => d.id === activeDomainId);
    
    if (activeDomainIndex === -1 || currentStepIndex === null) return;
    
    const domain = domains[activeDomainIndex];
    const currentLoop = [...domain.currentLoop];
    const nextStepIndex = currentStepIndex + 1;
    let nextStep: LearningStep;
    
    // Determine next step type based on current step
    switch (currentLoop[currentStepIndex].type) {
      case 'task':
        nextStep = {
          id: uuidv4(), // Add unique ID
          type: 'solution',
          title: 'Solution Generation',
          description: 'Solving the task...',
          status: 'pending',
          content: ''
        };
        break;
      case 'solution':
        nextStep = {
          id: uuidv4(), // Add unique ID
          type: 'verification',
          title: 'Verification',
          description: 'Verifying the solution...',
          status: 'pending',
          content: ''
        };
        break;
      case 'verification':
        nextStep = {
          id: uuidv4(), // Add unique ID
          type: 'reflection',
          title: 'Reflection',
          description: 'Analyzing the results...',
          status: 'pending',
          content: ''
        };
        break;
      case 'reflection':
        nextStep = {
          id: uuidv4(), // Add unique ID
          type: 'mutation',
          title: 'Task Mutation',
          description: 'Adapting for next loop...',
          status: 'pending',
          content: ''
        };
        break;
      default:
        return; // No more steps
    }
    
    // Add the next step to the loop with pending status
    currentLoop.push(nextStep);
    
    // Clone and update domains
    const updatedDomains = [...domains];
    const updatedDomain = { ...domain, currentLoop };
    updatedDomains[activeDomainIndex] = updatedDomain;
    
    set({ 
      domains: updatedDomains, 
      currentStepIndex: nextStepIndex 
    });
    
    // Execute the step using domain engine
    try {
      const engine = domainEngines[activeDomainId];
      
      let result;
      let metrics = {};
      
      switch (nextStep.type) {
        case 'solution':
          result = await engine.solveTask(currentLoop[0].content, activeDomainId);
          metrics = { timeMs: Math.floor(Math.random() * 1000) + 200 };
          break;
        case 'verification': {
          const solutionStep = currentLoop[1];
          // Fix for type conversion issues
          const solutionContent = typeof solutionStep === 'object' && solutionStep !== null 
            ? solutionStep.content 
            : String(solutionStep);
  
          result = await engine.verifySolution(
            currentLoop[0].content, 
            solutionContent,
            activeDomainId
          );
          
          // Default metrics if not provided in the result
          const isSuccessful = typeof result === 'object' && result !== null
            ? !String(result.content).toLowerCase().includes('incorrect')
            : !String(result).toLowerCase().includes('incorrect');
            
          metrics = { 
            correct: isSuccessful,
            timeMs: Math.floor(Math.random() * 300) + 50 
          };
          break;
        }
        case 'reflection': {
          const verificationData = currentLoop[2];
          const verificationContent = typeof verificationData === 'object' && verificationData !== null
            ? verificationData.content
            : String(verificationData);
            
          result = await engine.reflect(
            currentLoop[0].content,
            currentLoop[1].content || String(currentLoop[1]),
            verificationContent,
            activeDomainId
          );
          
          metrics = { insightCount: typeof result === 'object' && result !== null
            ? String(result.content).split('.').length - 1 
            : String(result).split('.').length - 1 
          };
          
          // Check for knowledge insights in reflection
          const reflectionText = typeof result === 'object' && result !== null ? 
            String(result.content) : String(result);
          
          if (nextStep.type === 'reflection' && !reflectionText.toLowerCase().includes('error')) {
            const insights = extractInsightsFromReflection(reflectionText);
            if (insights.length > 0) {
              const { createKnowledgeNode } = await import('../../utils/knowledgeGraph');
              const newDomains = [...get().domains];
              const domain = { ...newDomains[activeDomainIndex] };
              
              // Add knowledge nodes from insights
              insights.forEach(insight => {
                const newNode = createKnowledgeNode(insight, domain.totalLoops + 1, domain.id);
                domain.knowledgeNodes = [...(domain.knowledgeNodes || []), newNode];
              });
              
              newDomains[activeDomainIndex] = domain;
              set({ domains: newDomains });
            }
          }
          break;
        }
        case 'mutation':
          result = await engine.mutateTask(
            currentLoop[0].content,
            currentLoop[1].content || '',
            currentLoop[2].content || '',
            currentLoop[3].content || '',
            activeDomainId
          );
          metrics = { complexity: Math.floor(Math.random() * 10) + 1 };
          break;
        default:
          result = "Unexpected step type";
      }
      
      // Update step with result, handling both string and object responses
      const content = typeof result === 'object' && result !== null ? 
        String(result.content) : String(result);
      const metadata = typeof result === 'object' && result !== null ? 
        result.metadata : undefined;
      
      const status = content.toLowerCase().includes('error') || 
                   (nextStep.type === 'verification' && content.includes('Incorrect')) 
                   ? 'failure' : 'success';
      
      const updatedStep: LearningStep = {
        ...nextStep,
        status,
        content,
        metadata,
        metrics
      };
      
      // Update domain with completed step
      const newDomains = [...get().domains];
      const currentDomain = { ...newDomains[activeDomainIndex] };
      currentDomain.currentLoop[nextStepIndex] = updatedStep;
      
      // Update metrics if this is the verification step
      if (nextStep.type === 'verification') {
        // Update success rate in domain metrics
        const successRate = status === 'success' 
          ? Math.min((currentDomain.metrics?.successRate || 0) + 2, 100)
          : Math.max((currentDomain.metrics?.successRate || 0) - 5, 0);
          
        currentDomain.metrics = {
          ...(currentDomain.metrics || {}),
          successRate
        };
      }
      
      newDomains[activeDomainIndex] = currentDomain;
      
      set({ domains: newDomains });
      
      // If this was the mutation step, mark the loop as complete
      if (nextStep.type === 'mutation') {
        get().completeLoop();
      } else if (get().isContinuousMode) {
        // Continue to next step after delay if in continuous mode
        setTimeout(() => {
          const currentState = get();
          if (currentState.isContinuousMode && currentState.isRunningLoop) {
            get().advanceToNextStep();
          }
        }, get().loopDelay);
      }
    } catch (error) {
      // Handle error in step execution
      const updatedStep: LearningStep = {
        ...nextStep,
        status: 'failure',
        content: `Error: ${error}`
      };
      
      const newDomains = [...get().domains];
      const currentDomain = { ...newDomains[activeDomainIndex] };
      currentDomain.currentLoop[nextStepIndex] = updatedStep;
      newDomains[activeDomainIndex] = currentDomain;
      
      set({ domains: newDomains });
    }
  },
  
  completeLoop: () => {
    const { domains, activeDomainId, useRemoteLogging } = get();
    const activeDomainIndex = domains.findIndex(d => d.id === activeDomainId);
    
    if (activeDomainIndex === -1) return;
    
    const updatedDomains = [...domains];
    const domain = { ...updatedDomains[activeDomainIndex] };
    const reflectionStep = domain.currentLoop?.find(step => step.type === 'reflection');
    const reflectionText = reflectionStep?.content || '';
    
    // Extract insights from reflection
    const insights = extractInsightsFromReflection(reflectionText);
    let newNodes = [];
    let newEdges = [];
    
    // Use dynamic imports to resolve circular dependencies
    import('../../utils/knowledgeGraph').then(({ createKnowledgeNode, createEdgesBetweenNodes, calculateGraphLayout }) => {
      // Create knowledge nodes from insights
      if (insights.length > 0) {
        insights.forEach(insight => {
          const newNode = createKnowledgeNode(insight, domain.totalLoops + 1, domain.id);
          domain.knowledgeNodes = [...(domain.knowledgeNodes || []), newNode];
          newNodes.push(newNode);
          
          // Create edges between the new node and existing nodes
          const nodeEdges = createEdgesBetweenNodes(newNode, domain.knowledgeNodes || []);
          domain.knowledgeEdges = [...(domain.knowledgeEdges || []), ...nodeEdges];
          newEdges = [...newEdges, ...nodeEdges];
        });
        
        // Recalculate node positions for better layout
        domain.knowledgeNodes = calculateGraphLayout(domain.knowledgeNodes || [], domain.knowledgeEdges || []);
      }
      
      // Generate a loop history record with proper UUID
      const loopId = uuidv4();
      const completedLoop: LoopHistory = {
        id: loopId,
        domainId: domain.id,
        steps: [...(domain.currentLoop || [])],
        timestamp: Date.now(),
        totalTime: Math.floor(Math.random() * 5000) + 3000,
        success: domain.currentLoop?.some(step => step.type === 'verification' && step.status === 'success') || false,
        score: (domain.metrics?.successRate || 0),
        startTime: new Date().toISOString(),
        status: 'completed',
        insights: insights.map((text, index) => ({
          text,
          confidence: newNodes[index]?.confidence || 0.7,
          nodeIds: newNodes[index] ? [newNodes[index].id] : undefined
        }))
      };
      
      // Add to history
      const updatedHistory = [...get().loopHistory, completedLoop];
      
      // Trim history if too large (keep most recent 100 loops)
      const trimmedHistory = updatedHistory.length > 100 
        ? updatedHistory.slice(updatedHistory.length - 100) 
        : updatedHistory;
      
      // If remote logging is enabled, save to Supabase
      if (useRemoteLogging) {
        import('../../utils/supabase').then(({ 
          logLoopToSupabase, 
          saveKnowledgeNodeToSupabase, 
          saveKnowledgeEdgeToSupabase, 
          updateDomainInSupabase 
        }) => {
          console.log("Attempting to save loop to Supabase:", completedLoop);
          
          // Log the completed loop
          logLoopToSupabase(completedLoop)
            .then(success => {
              if (success) {
                console.log("Loop saved successfully to Supabase");
              } else {
                console.error("Failed to save loop to Supabase");
              }
            })
            .catch(error => {
              console.error("Exception when saving loop:", error);
            });
          
          // Log each new knowledge node
          newNodes.forEach(node => {
            saveKnowledgeNodeToSupabase(node);
          });
          
          // Log each new knowledge edge
          newEdges.forEach(edge => {
            saveKnowledgeEdgeToSupabase(edge);
          });
          
          // Update the domain with the new total loops count
          updateDomainInSupabase(domain);
        });
      }
      
      // Increment total loops
      domain.totalLoops = (domain.totalLoops || 0) + 1;
      
      // Update metrics
      // Add a new node to knowledge growth
      const knowledgeGrowth = domain.metrics?.knowledgeGrowth || [];
      const lastEntry = knowledgeGrowth[knowledgeGrowth.length - 1] || { nodes: 0 };
      knowledgeGrowth.push({
        name: `Loop ${domain.totalLoops}`,
        nodes: lastEntry.nodes + insights.length
      });
      
      // Update task difficulty
      const taskDifficulty = [...(domain.metrics?.taskDifficulty || [])];
      const difficulty = Math.floor(Math.random() * 10) + 1;
      const success = Math.random() > 0.3 ? difficulty - 1 : difficulty - 3;
      taskDifficulty.push({
        name: `Loop ${domain.totalLoops}`,
        difficulty,
        success: Math.max(0, success)
      });
      if (taskDifficulty.length > 10) {
        taskDifficulty.shift(); // Keep only last 10 entries
      }
      
      // Update skills
      const skills = [...(domain.metrics?.skills || [])];
      skills.forEach((skill, i) => {
        // Randomly increase some skills
        if (Math.random() > 0.7) {
          skills[i] = {
            ...skill,
            level: Math.min(skill.level + Math.floor(Math.random() * 3), 100)
          };
        }
      });
      
      domain.metrics = {
        ...(domain.metrics || {}),
        knowledgeGrowth,
        taskDifficulty,
        skills
      };
      
      updatedDomains[activeDomainIndex] = domain;
      
      // Reset for next loop
      set({ 
        domains: updatedDomains,
        loopHistory: trimmedHistory,
        isRunningLoop: false,
        currentStepIndex: null
      });
      
      // If continuous mode is on, start a new loop after delay
      if (get().isContinuousMode) {
        setTimeout(() => {
          const currentState = get();
          if (currentState.isContinuousMode) {
            get().startNewLoop();
          }
        }, get().loopDelay);
      }
    });
  },
  
  cancelCurrentLoop: () => {
    const { domains, activeDomainId } = get();
    const activeDomainIndex = domains.findIndex(d => d.id === activeDomainId);
    
    if (activeDomainIndex === -1) return;
    
    // Log the cancellation for debugging
    console.log('Canceling current learning loop');
    
    // Reset the running state AND clear the current loop
    const updatedDomains = [...domains];
    const updatedDomain = { ...updatedDomains[activeDomainIndex] };
    // Clear the current loop completely so we can start a new one
    updatedDomain.currentLoop = [];
    updatedDomains[activeDomainIndex] = updatedDomain;
    
    // Update the state
    set({ 
      domains: updatedDomains,
      isRunningLoop: false,
      currentStepIndex: null
    });
    
    // Show confirmation to the user
    toast.success('Learning loop cancelled');
  },
  
  loadPreviousLoop: (loopId) => {
    const { loopHistory } = get();
    
    if (loopHistory.length === 0) {
      console.log('No loop history available');
      return;
    }
    
    // Find the loop by ID or get the most recent one
    const loop = loopId 
      ? loopHistory.find(l => l.id === loopId) 
      : loopHistory[loopHistory.length - 1];
      
    if (!loop) {
      console.log(`Loop with ID ${loopId} not found`);
      return;
    }
    
    // Update the current domain with the selected loop data
    const { domains } = get();
    const domainIndex = domains.findIndex(d => d.id === loop.domainId);
    
    if (domainIndex === -1) {
      console.log(`Domain ${loop.domainId} not found`);
      return;
    }
    
    const updatedDomains = [...domains];
    const domain = { ...updatedDomains[domainIndex] };
    
    // Set the current loop to the historical loop
    domain.currentLoop = [...loop.steps];
    
    updatedDomains[domainIndex] = domain;
    
    // Update state
    set({
      domains: updatedDomains,
      activeDomainId: loop.domainId,
      isRunningLoop: false, // We're viewing history, not running
      currentStepIndex: null
    });
  },
  
  toggleContinuousMode: () => {
    const currentMode = get().isContinuousMode;
    const newMode = !currentMode;
    
    set({ isContinuousMode: newMode });
    
    // If turning on continuous mode and no active loop, start one
    if (newMode && !get().isRunningLoop) {
      get().startNewLoop();
    }
  },
  
  setLoopDelay: (delay) => {
    set({ loopDelay: delay });
  },
  
  pauseLoops: () => {
    set({ isContinuousMode: false });
  },
});
