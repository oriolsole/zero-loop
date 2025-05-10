
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Domain, LearningStep } from '../types/intelligence';
import { domainsData } from '../data/mockData';
import { domainEngines } from '../engines/domainEngines';

export interface LoopState {
  domains: Domain[];
  activeDomainId: string;
  isRunningLoop: boolean;
  currentStepIndex: number | null;
  
  // Actions
  setActiveDomain: (domainId: string) => void;
  startNewLoop: () => Promise<void>;
  advanceToNextStep: () => Promise<void>;
  completeLoop: () => void;
  loadPreviousLoop: () => void;
}

export const useLoopStore = create<LoopState>()(
  persist(
    (set, get) => ({
      domains: domainsData,
      activeDomainId: 'logic',
      isRunningLoop: false,
      currentStepIndex: null,
      
      setActiveDomain: (domainId) => {
        set({ activeDomainId: domainId });
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
        
        // Save the completed loop to history (in a real app, we'd persist this)
        // For now we're just updating the domain
        
        updatedDomains[activeDomainIndex] = domain;
        
        // Reset for next loop
        set({ 
          domains: updatedDomains,
          isRunningLoop: false,
          currentStepIndex: null
        });
        
        // Save to localStorage via Zustand persist
      },
      
      loadPreviousLoop: () => {
        // In a real app, we would fetch from history storage
        // For now, this is just a placeholder
        console.log('Loading previous loop - not implemented');
      }
    }),
    {
      name: 'intelligence-loop-storage'
    }
  )
);
