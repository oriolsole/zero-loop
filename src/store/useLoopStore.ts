import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Domain, LearningStep, LoopHistory, KnowledgeNode, KnowledgeEdge } from '../types/intelligence';
import { domainsData } from '../data/mockData';
import { domainEngines } from '../engines/domainEngines';
import { 
  extractInsightsFromReflection, 
  createKnowledgeNode, 
  createEdgesBetweenNodes,
  calculateGraphLayout 
} from '../utils/knowledgeGraph';
import { toast } from '@/components/ui/sonner';

export interface LoopState {
  domains: Domain[];
  activeDomainId: string;
  isRunningLoop: boolean;
  currentStepIndex: number | null;
  isContinuousMode: boolean;
  loopDelay: number;
  loopHistory: LoopHistory[];
  selectedInsightId: string | null;
  useRemoteLogging: boolean;
  
  // Actions
  setActiveDomain: (domainId: string) => void;
  startNewLoop: () => Promise<void>;
  advanceToNextStep: () => Promise<void>;
  completeLoop: () => void;
  loadPreviousLoop: (loopId?: string) => void;
  toggleContinuousMode: () => void;
  setLoopDelay: (delay: number) => void;
  pauseLoops: () => void;
  setSelectedInsight: (nodeId: string | null) => void;
  recalculateGraphLayout: () => void;
  setUseRemoteLogging: (useRemote: boolean) => void;
  
  // Domain management actions
  addNewDomain: (domain: Domain) => void;
  updateDomain: (domain: Domain) => void;
  deleteDomain: (domainId: string) => void;
}

// Initialize domains with empty edges array if not already present
const initializedDomains = domainsData.map(domain => ({
  ...domain,
  knowledgeEdges: domain.knowledgeEdges || [] as KnowledgeEdge[]
}));

export const useLoopStore = create<LoopState>()(
  persist(
    (set, get) => ({
      domains: initializedDomains,
      activeDomainId: 'logic',
      isRunningLoop: false,
      currentStepIndex: null,
      isContinuousMode: false,
      loopDelay: 2000,
      loopHistory: [],
      selectedInsightId: null,
      useRemoteLogging: false,
      
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
                const insights = extractInsightsFromReflection(result);
                if (insights.length > 0) {
                  const newDomains = [...get().domains];
                  const domain = { ...newDomains[activeDomainIndex] };
                  
                  // Add knowledge nodes from insights
                  insights.forEach(insight => {
                    const newNode = createKnowledgeNode(insight, domain.totalLoops + 1, domain.id);
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
        const reflectionStep = domain.currentLoop.find(step => step.type === 'reflection');
        const reflectionText = reflectionStep?.content || '';
        
        // Extract insights from reflection
        const insights = extractInsightsFromReflection(reflectionText);
        let newNodes: KnowledgeNode[] = [];
        let newEdges: KnowledgeEdge[] = [];
        
        // Create knowledge nodes from insights
        if (insights.length > 0) {
          insights.forEach(insight => {
            const newNode = createKnowledgeNode(insight, domain.totalLoops + 1, domain.id);
            domain.knowledgeNodes = [...domain.knowledgeNodes, newNode];
            newNodes.push(newNode);
            
            // Create edges between the new node and existing nodes
            const nodeEdges = createEdgesBetweenNodes(newNode, domain.knowledgeNodes);
            domain.knowledgeEdges = [...(domain.knowledgeEdges || []), ...nodeEdges];
            newEdges = [...newEdges, ...nodeEdges];
          });
          
          // Recalculate node positions for better layout
          domain.knowledgeNodes = calculateGraphLayout(domain.knowledgeNodes, domain.knowledgeEdges || []);
        }
        
        // Generate a loop history record
        const completedLoop: LoopHistory = {
          id: `loop-${domain.id}-${Date.now()}`,
          domainId: domain.id,
          steps: [...domain.currentLoop],
          timestamp: Date.now(),
          totalTime: Math.floor(Math.random() * 5000) + 3000, // Simulate actual execution time
          success: domain.currentLoop.some(step => step.type === 'verification' && step.status === 'success'),
          score: domain.metrics.successRate,
          insights: insights.map((text, index) => ({
            text,
            confidence: newNodes[index]?.confidence || 0.7,
            nodeIds: newNodes[index] ? [newNodes[index].id] : undefined
          }))
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
          nodes: lastEntry.nodes + insights.length
        });
        
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
      },
      
      setSelectedInsight: (nodeId) => {
        set({ selectedInsightId: nodeId });
      },
      
      recalculateGraphLayout: () => {
        const { domains, activeDomainId } = get();
        const activeDomainIndex = domains.findIndex(d => d.id === activeDomainId);
        
        if (activeDomainIndex === -1) return;
        
        const updatedDomains = [...domains];
        const domain = { ...updatedDomains[activeDomainIndex] };
        
        // Recalculate node positions
        domain.knowledgeNodes = calculateGraphLayout(
          domain.knowledgeNodes, 
          domain.knowledgeEdges || []
        );
        
        updatedDomains[activeDomainIndex] = domain;
        set({ domains: updatedDomains });
      },
      
      setUseRemoteLogging: (useRemote) => {
        set({ useRemoteLogging: useRemote });
      },
      
      addNewDomain: (domain) => {
        // Make sure the domain has all required fields
        const completeDomain: Domain = {
          ...domain,
          totalLoops: domain.totalLoops || 0,
          currentLoop: domain.currentLoop || [],
          knowledgeNodes: domain.knowledgeNodes || [],
          knowledgeEdges: domain.knowledgeEdges || [],
          metrics: domain.metrics || {
            successRate: 0,
            knowledgeGrowth: [{ name: 'Start', nodes: 0 }],
            taskDifficulty: [{ name: 'Start', difficulty: 1, success: 1 }],
            skills: [{ name: 'Learning', level: 1 }]
          }
        };
        
        // Add the new domain
        set(state => ({
          domains: [...state.domains, completeDomain],
          activeDomainId: domain.id // Switch to the new domain
        }));
        
        toast.success('New domain created!');
      },
      
      updateDomain: (updatedDomain) => {
        set(state => {
          const domainIndex = state.domains.findIndex(d => d.id === updatedDomain.id);
          if (domainIndex === -1) return state;
          
          const newDomains = [...state.domains];
          
          // Keep the existing complex data while updating the basic info
          newDomains[domainIndex] = {
            ...state.domains[domainIndex],
            name: updatedDomain.name,
            shortDesc: updatedDomain.shortDesc,
            description: updatedDomain.description,
            // Other fields from the updated domain
          };
          
          return { domains: newDomains };
        });
        
        toast.success('Domain updated!');
      },
      
      deleteDomain: (domainId) => {
        const { domains, activeDomainId } = get();
        
        // Don't delete if it's the only domain
        if (domains.length <= 1) {
          toast.error('Cannot delete the only domain');
          return;
        }
        
        // Create a new domains array without the deleted domain
        const newDomains = domains.filter(d => d.id !== domainId);
        
        // If deleting the active domain, switch to the first remaining one
        const newActiveDomain = activeDomainId === domainId
          ? newDomains[0].id
          : activeDomainId;
          
        set({ 
          domains: newDomains,
          activeDomainId: newActiveDomain
        });
        
        toast.success('Domain deleted!');
      }
    }),
    {
      name: 'intelligence-loop-storage'
    }
  )
);
