
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Domain, LearningStep, LoopHistory, KnowledgeNode } from '../types/intelligence';
import { domainsData } from '../data/mockData';
import { domainEngines } from '../engines/domainEngines';

export interface LoopState {
  domains: Domain[];
  activeDomainId: string;
  isRunningLoop: boolean;
  currentStepIndex: number | null;
  isContinuousMode: boolean;
  loopDelay: number;
  loopHistory: LoopHistory[];
  
  // Actions
  setActiveDomain: (domainId: string) => void;
  startNewLoop: () => Promise<void>;
  advanceToNextStep: () => Promise<void>;
  completeLoop: () => void;
  loadPreviousLoop: (loopId?: string) => void;
  toggleContinuousMode: () => void;
  setLoopDelay: (delay: number) => void;
  pauseLoops: () => void;
}

export const useLoopStore = create<LoopState>()(
  persist(
    (set, get) => ({
      domains: domainsData,
      activeDomainId: 'logic',
      isRunningLoop: false,
      currentStepIndex: null,
      isContinuousMode: false,
      loopDelay: 2000,
      loopHistory: [],
      
      setActiveDomain: (domainId) => {
        // Only allow domain change when not in a running loop
        if (!get().isRunningLoop) {
          set({ activeDomainId: domainId });
        }
      },
      
      startNewLoop: async () => {
        const { domains, activeDomainId } = get();
        const activeDomainIndex = domains.findIndex(d => d.id === activeDomainId);
        
        if (activeDomainIndex === -1) return;
        
        // Create initial step with pending status
        const initialStep: LearningStep = {
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
          const engine = domainEngines[activeDomainId];
          const taskContent = await engine.generateTask();
          
          const updatedStep: LearningStep = {
            ...initialStep,
            status: 'success',
            content: taskContent,
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
              type: 'solution',
              title: 'Solution Generation',
              description: 'Solving the task...',
              status: 'pending',
              content: ''
            };
            break;
          case 'solution':
            nextStep = {
              type: 'verification',
              title: 'Verification',
              description: 'Verifying the solution...',
              status: 'pending',
              content: ''
            };
            break;
          case 'verification':
            nextStep = {
              type: 'reflection',
              title: 'Reflection',
              description: 'Analyzing the results...',
              status: 'pending',
              content: ''
            };
            break;
          case 'reflection':
            nextStep = {
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
          const previousSteps = currentLoop.slice(0, nextStepIndex);
          
          let result;
          let metrics = {};
          
          switch (nextStep.type) {
            case 'solution':
              result = await engine.solveTask(currentLoop[0].content);
              metrics = { timeMs: Math.floor(Math.random() * 1000) + 200 };
              break;
            case 'verification':
              result = await engine.verifySolution(
                currentLoop[0].content, 
                currentLoop[1].content
              );
              metrics = { 
                correct: result.includes('Correct'),
                timeMs: Math.floor(Math.random() * 300) + 50 
              };
              break;
            case 'reflection':
              result = await engine.reflect(
                currentLoop[0].content,
                currentLoop[1].content,
                currentLoop[2].content
              );
              metrics = { insightCount: result.split('.').length - 1 };
              
              // Check for knowledge insights in reflection
              if (nextStep.type === 'reflection' && !result.toLowerCase().includes('error')) {
                const insights = extractInsights(result);
                if (insights.length > 0) {
                  const newDomains = [...get().domains];
                  const domain = { ...newDomains[activeDomainIndex] };
                  
                  // Add knowledge nodes from insights
                  insights.forEach(insight => {
                    const newNode = createKnowledgeNode(insight, domain.totalLoops + 1);
                    domain.knowledgeNodes = [...domain.knowledgeNodes, newNode];
                  });
                  
                  newDomains[activeDomainIndex] = domain;
                  set({ domains: newDomains });
                }
              }
              break;
            case 'mutation':
              result = await engine.mutateTask(
                currentLoop[0].content,
                currentLoop.slice(1, 4).map(s => s.content)
              );
              metrics = { complexity: Math.floor(Math.random() * 10) + 1 };
              break;
            default:
              result = "Unexpected step type";
          }
          
          // Update step with result
          const status = result.toLowerCase().includes('error') || 
                         (nextStep.type === 'verification' && result.includes('Incorrect')) 
                         ? 'failure' : 'success';
          
          const updatedStep: LearningStep = {
            ...nextStep,
            status,
            content: result,
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
              ? Math.min(currentDomain.metrics.successRate + 2, 100)
              : Math.max(currentDomain.metrics.successRate - 5, 0);
              
            currentDomain.metrics = {
              ...currentDomain.metrics,
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
        const { domains, activeDomainId } = get();
        const activeDomainIndex = domains.findIndex(d => d.id === activeDomainId);
        
        if (activeDomainIndex === -1) return;
        
        const updatedDomains = [...domains];
        const domain = { ...updatedDomains[activeDomainIndex] };
        
        // Generate a loop history record
        const completedLoop: LoopHistory = {
          id: `loop-${domain.id}-${Date.now()}`,
          domainId: domain.id,
          steps: [...domain.currentLoop],
          timestamp: Date.now(),
          totalTime: Math.floor(Math.random() * 5000) + 3000, // Simulate actual execution time
          success: domain.currentLoop.some(step => step.type === 'verification' && step.status === 'success'),
          score: domain.metrics.successRate
        };
        
        // Add to history
        const updatedHistory = [...get().loopHistory, completedLoop];
        
        // Trim history if too large (keep most recent 100 loops)
        if (updatedHistory.length > 100) {
          updatedHistory.splice(0, updatedHistory.length - 100);
        }
        
        // Increment total loops
        domain.totalLoops += 1;
        
        // Update metrics
        // Add a new node to knowledge growth
        const latestKnowledge = [...domain.metrics.knowledgeGrowth];
        const lastEntry = latestKnowledge[latestKnowledge.length - 1];
        latestKnowledge.push({
          name: `Loop ${domain.totalLoops}`,
          nodes: lastEntry.nodes + Math.floor(Math.random() * 3)
        });
        
        // Maybe add a new knowledge node occasionally
        if (Math.random() > 0.7) {
          const nodeTypes = ['rule', 'concept', 'pattern', 'insight'];
          const newNode = {
            id: `node-${domain.knowledgeNodes.length + 1}`,
            title: `Learned Pattern ${domain.knowledgeNodes.length + 1}`,
            description: `A pattern discovered in loop ${domain.totalLoops}`,
            type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)] as any,
            discoveredInLoop: domain.totalLoops,
            position: {
              x: Math.random() * 800,
              y: Math.random() * 600
            }
          };
          domain.knowledgeNodes = [...domain.knowledgeNodes, newNode];
        }
        
        // Update task difficulty
        const taskDifficulty = [...domain.metrics.taskDifficulty];
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
        const skills = [...domain.metrics.skills];
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
          ...domain.metrics,
          knowledgeGrowth: latestKnowledge,
          taskDifficulty,
          skills
        };
        
        updatedDomains[activeDomainIndex] = domain;
        
        // Reset for next loop
        set({ 
          domains: updatedDomains,
          loopHistory: updatedHistory,
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
      }
    }),
    {
      name: 'intelligence-loop-storage'
    }
  )
);

// Helper function to extract insights from reflection text
function extractInsights(reflectionText: string): string[] {
  const insights: string[] = [];
  
  // Simple rule-based extraction (can be made more sophisticated)
  const sentences = reflectionText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach(sentence => {
    // Look for sentences that seem to contain insights
    if (
      sentence.toLowerCase().includes('learned') ||
      sentence.toLowerCase().includes('insight') ||
      sentence.toLowerCase().includes('pattern') ||
      sentence.toLowerCase().includes('discovered') ||
      sentence.toLowerCase().includes('understanding') ||
      sentence.toLowerCase().includes('key concept')
    ) {
      insights.push(sentence.trim());
    }
  });
  
  return insights;
}

// Helper function to create a knowledge node from an insight
function createKnowledgeNode(insight: string, loopNumber: number): KnowledgeNode {
  // Determine the type of node based on content
  let nodeType: 'rule' | 'concept' | 'pattern' | 'insight' = 'insight';
  
  if (insight.toLowerCase().includes('rule') || insight.toLowerCase().includes('should')) {
    nodeType = 'rule';
  } else if (insight.toLowerCase().includes('pattern') || insight.toLowerCase().includes('common')) {
    nodeType = 'pattern';
  } else if (insight.toLowerCase().includes('concept') || insight.toLowerCase().includes('understand')) {
    nodeType = 'concept';
  }
  
  // Generate a title from the insight
  const title = insight.length > 30 ? `${insight.substring(0, 30)}...` : insight;
  
  return {
    id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    description: insight,
    type: nodeType,
    discoveredInLoop: loopNumber,
    position: {
      x: Math.random() * 80, // Position as percentage of container
      y: Math.random() * 80
    },
    size: Math.floor(Math.random() * 10) + 10 // Random size between 10-20%
  };
}
