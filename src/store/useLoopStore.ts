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
import { 
  saveDomainToSupabase, 
  updateDomainInSupabase, 
  deleteDomainFromSupabase,
  loadDomainsFromSupabase
} from '../utils/supabase';
import { isSupabaseConfigured } from '../utils/supabase-client';
import { toast } from '@/components/ui/sonner';
import { v4 as uuidv4 } from 'uuid';

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
  isInitialized: boolean;
  
  // Actions
  initializeFromSupabase: () => Promise<void>;
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

// Convert existing domain IDs to UUIDs if they're not already
const convertedDomains = domainsData.map(domain => {
  // Check if the domain ID is already a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(domain.id)) {
    return {
      ...domain,
      id: uuidv4(),
      knowledgeEdges: domain.knowledgeEdges || [] as KnowledgeEdge[]
    };
  }
  return {
    ...domain,
    knowledgeEdges: domain.knowledgeEdges || [] as KnowledgeEdge[]
  };
});

export const useLoopStore = create<LoopState>()(
  persist(
    (set, get) => ({
      domains: convertedDomains,
      activeDomainId: convertedDomains[0]?.id || '',
      isRunningLoop: false,
      currentStepIndex: null,
      isContinuousMode: false,
      loopDelay: 2000,
      loopHistory: [],
      selectedInsightId: null,
      useRemoteLogging: false,
      isInitialized: false,
      
      initializeFromSupabase: async () => {
        // Skip if already initialized or Supabase not configured
        if (get().isInitialized || !isSupabaseConfigured() || !get().useRemoteLogging) {
          set({ isInitialized: true }); // Mark as initialized even if not using remote
          return;
        }
        
        try {
          console.log('Initializing domains from Supabase...');
          const remoteDomains = await loadDomainsFromSupabase();
          
          if (remoteDomains.length > 0) {
            console.log(`Loaded ${remoteDomains.length} domains from Supabase`);
            
            // Keep local knowledge nodes and edges for each domain
            const mergedDomains = remoteDomains.map(remoteDomain => {
              // Find matching local domain (if any)
              const localDomain = get().domains.find(d => d.id === remoteDomain.id);
              
              if (localDomain) {
                return {
                  ...remoteDomain,
                  knowledgeNodes: localDomain.knowledgeNodes,
                  knowledgeEdges: localDomain.knowledgeEdges || []
                };
              }
              
              return {
                ...remoteDomain,
                knowledgeNodes: [],
                knowledgeEdges: []
              };
            });
            
            // If there are any domains locally that don't exist in remote, add them
            const remoteDomainIds = new Set(remoteDomains.map(d => d.id));
            const localOnlyDomains = get().domains.filter(d => !remoteDomainIds.has(d.id));
            
            const allDomains = [...mergedDomains, ...localOnlyDomains];
            
            // Set the active domain to the first one if the current one doesn't exist
            const activeDomainExists = allDomains.some(d => d.id === get().activeDomainId);
            const newActiveDomainId = activeDomainExists 
              ? get().activeDomainId 
              : (allDomains[0]?.id || '');
            
            set({ 
              domains: allDomains,
              activeDomainId: newActiveDomainId,
              isInitialized: true
            });
            
            console.log('Domains initialized from Supabase');
          } else {
            console.log('No domains found in Supabase, keeping local domains');
            set({ isInitialized: true });
          }
        } catch (error) {
          console.error('Error initializing domains from Supabase:', error);
          set({ isInitialized: true }); // Mark as initialized even on error
        }
      },
      
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
          const engine = domainEngines[activeDomainId] || domainEngines[Object.keys(domainEngines)[0]];
          const taskContent = await engine.generateTask();
          
          // Handle both string and complex object responses
          // Fix for error TS18047: 'taskContent' is possibly 'null'
          const content = typeof taskContent === 'string' ? taskContent : (taskContent?.content || '');
          const metadata = typeof taskContent === 'object' && taskContent !== null ? taskContent.metadata : undefined;
          
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
            case 'verification': {
              const solutionStep = currentLoop[1];
              // Fix for error TS2345: Convert to string properly
              const solutionContent = typeof solutionStep === 'object' && solutionStep !== null 
                ? solutionStep.content 
                : String(solutionStep); // Convert to string to be safe
      
              result = await engine.verifySolution(
                currentLoop[0].content, 
                solutionContent
              );
              
              // Default metrics if not provided in the result
              const isSuccessful = typeof result === 'object'
                ? !result.content.toLowerCase().includes('incorrect')
                : !String(result).toLowerCase().includes('incorrect');
                
              metrics = { 
                correct: isSuccessful,
                timeMs: Math.floor(Math.random() * 300) + 50 
              };
              break;
            }
            case 'reflection':
              const verificationData = currentLoop[2];
              // Fix similar string conversion issue
              const verificationContent = typeof verificationData === 'object' && verificationData !== null
                ? verificationData.content
                : String(verificationData);
                
              result = await engine.reflect(
                currentLoop[0].content,
                currentLoop[1].content || String(currentLoop[1]),
                verificationContent
              );
              
              metrics = { insightCount: typeof result === 'string' 
                ? result.split('.').length - 1 
                : result.content.split('.').length - 1 
              };
              
              // Check for knowledge insights in reflection
              const reflectionText = typeof result === 'object' ? result.content : result;
              
              if (nextStep.type === 'reflection' && !reflectionText.toLowerCase().includes('error')) {
                const insights = extractInsightsFromReflection(reflectionText);
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
                currentLoop.slice(1, 4).map(s => typeof s === 'object' && s !== null ? s.content : String(s))
              );
              metrics = { complexity: Math.floor(Math.random() * 10) + 1 };
              break;
            default:
              result = "Unexpected step type";
          }
          
          // Update step with result, handling both string and object responses
          const content = typeof result === 'object' ? result.content : result;
          const metadata = typeof result === 'object' ? result.metadata : undefined;
          
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
        const { domains, activeDomainId, useRemoteLogging } = get();
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
        
        // Generate a loop history record with proper UUID instead of custom ID format
        const completedLoop: LoopHistory = {
          id: uuidv4(), // Using UUID v4 format for consistency with database
          domainId: domain.id,
          steps: [...domain.currentLoop],
          timestamp: Date.now(),
          totalTime: Math.floor(Math.random() * 5000) + 3000,
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
        
        // If remote logging is enabled, save to Supabase
        if (useRemoteLogging) {
          import('../utils/supabase').then(({ 
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
        const { isInitialized } = get();
        
        set({ useRemoteLogging: useRemote });
        
        // If enabling remote logging and not initialized, initialize from Supabase
        if (useRemote && !isInitialized) {
          get().initializeFromSupabase();
        }
      },
      
      addNewDomain: (domain) => {
        // Make sure the domain has all required fields and a UUID
        const domainId = domain.id && domain.id.includes('-') ? domain.id : uuidv4();
        
        const completeDomain: Domain = {
          ...domain,
          id: domainId,
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
          activeDomainId: domainId // Switch to the new domain
        }));
        
        // If remote logging is enabled, save to Supabase
        if (get().useRemoteLogging && isSupabaseConfigured()) {
          saveDomainToSupabase(completeDomain)
            .then(success => {
              if (success) {
                console.log('Domain saved to Supabase:', domainId);
              }
            })
            .catch(error => {
              console.error('Error saving domain to Supabase:', error);
            });
        }
        
        toast.success('New domain created!');
      },
      
      updateDomain: (updatedDomain) => {
        set(state => {
          const domainIndex = state.domains.findIndex(d => d.id === updatedDomain.id);
          if (domainIndex === -1) return state;
          
          const newDomains = [...state.domains];
          
          // Keep the existing complex data while updating the basic info
          const existingDomain = state.domains[domainIndex];
          newDomains[domainIndex] = {
            ...existingDomain,
            name: updatedDomain.name,
            shortDesc: updatedDomain.shortDesc,
            description: updatedDomain.description,
          };

          // If remote logging is enabled, update in Supabase
          if (state.useRemoteLogging && isSupabaseConfigured()) {
            updateDomainInSupabase(newDomains[domainIndex])
              .then(success => {
                if (success) {
                  console.log('Domain updated in Supabase:', updatedDomain.id);
                }
              })
              .catch(error => {
                console.error('Error updating domain in Supabase:', error);
              });
          }
          
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
        
        // If remote logging is enabled, delete from Supabase
        if (get().useRemoteLogging && isSupabaseConfigured()) {
          deleteDomainFromSupabase(domainId)
            .then(success => {
              if (success) {
                console.log('Domain deleted from Supabase:', domainId);
              }
            })
            .catch(error => {
              console.error('Error deleting domain from Supabase:', error);
            });
        }
        
        toast.success('Domain deleted!');
      },
      
      verifySolution: async (task: string, solution: string) => {
        try {
          // Initialize the useExternalKnowledge hook functions
          const knowledgeModule = await import('../hooks/useExternalKnowledge');
          const { verifyWithKnowledge } = knowledgeModule.useExternalKnowledge();
          
          // Use the knowledge base and web to verify the solution
          const verificationResult = await verifyWithKnowledge(solution, { 
            useWeb: true, 
            useKnowledgeBase: true,
            limit: 3
          });
          
          // Call the AI for verification with the sources as context
          const { data, error } = await supabase.functions.invoke('ai-reasoning', {
            body: { 
              operation: 'verifySolution',
              task,
              solution,
              domain: 'Web Knowledge',
              domainContext: `Evaluate the factual accuracy and completeness of this research answer. Confidence score: ${verificationResult.confidence}.`
            }
          });

          if (error) throw new Error(`Web knowledge error: ${error.message}`);
          
          return data?.result || 'Failed to verify research';
        } catch (error) {
          console.error('Error verifying research:', error);
          toast.error('Failed to verify research');
          return 'Error verifying research. Please try again later.';
        }
      }
    }),
    {
      name: 'intelligence-loop-storage',
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            // Initialize from Supabase if remote logging is enabled
            if (state.useRemoteLogging) {
              setTimeout(() => {
                state.initializeFromSupabase();
              }, 0);
            } else {
              state.isInitialized = true;
            }
          }
        };
      }
    }
  )
);

// Initialize from Supabase if remote logging is enabled when the app starts
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const state = useLoopStore.getState();
    if (state.useRemoteLogging && !state.isInitialized) {
      state.initializeFromSupabase();
    }
  }, 100);
}
