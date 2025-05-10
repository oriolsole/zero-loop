
import { DomainEngine } from '../types/intelligence';

// Predefined tasks and solutions for logical reasoning
const logicalTasks = [
  {
    task: "If all A are B, and all B are C, what can we conclude?",
    solution: "All A are C",
    verification: "Correct. This is a valid syllogism using transitive property.",
    reflection: "This task tests understanding of transitive properties in categorical syllogisms. The correct solution follows from combining the two premises."
  },
  {
    task: "If it's raining, the ground is wet. The ground is wet. Is it necessarily raining?",
    solution: "No, the ground could be wet for other reasons.",
    verification: "Correct. This avoids the fallacy of affirming the consequent.",
    reflection: "This task tests the ability to recognize logical fallacies, specifically affirming the consequent. The ground being wet doesn't necessarily mean it's raining, as there could be other causes."
  },
  {
    task: "All birds can fly. Penguins are birds. Can penguins fly?",
    solution: "The conclusion that penguins can fly does not necessarily follow because the first premise is false. Not all birds can fly.",
    verification: "Correct. The task contains a false premise that leads to an incorrect conclusion.",
    reflection: "This task tests the ability to evaluate the soundness of an argument by checking the truth of its premises. Even if the logical form is valid, false premises can lead to false conclusions."
  },
  {
    task: "If P implies Q, and Q is false, what can we say about P?",
    solution: "P must be false.",
    verification: "Correct. This is an application of modus tollens.",
    reflection: "This task tests understanding of modus tollens, a fundamental rule in propositional logic. When a conditional statement is true and its consequent is false, the antecedent must also be false."
  },
  {
    task: "Either it is day or it is night. It is not day. What can we conclude?",
    solution: "It is night.",
    verification: "Correct. This is an application of disjunctive syllogism.",
    reflection: "This task tests understanding of disjunctive syllogism. When faced with an 'either/or' statement, if one option is eliminated, the other must be true."
  }
];

// More complex mutations based on previous tasks
const mutationPatterns = [
  (task: string) => `Consider the inverse of this problem: ${task.replace('If', 'If not')}`,
  (task: string) => `Extend this problem with an additional condition: ${task} Additionally, X is true.`,
  (task: string) => `Reformulate this problem in terms of necessary and sufficient conditions: ${task}`,
  (task: string) => task.includes('All') ? task.replace('All', 'Some') : task.replace('Some', 'All'),
  (task: string) => `${task} Now consider this in a probabilistic rather than deterministic framework.`
];

export const logicalReasoningEngine: DomainEngine = {
  generateTask: async () => {
    const randomTask = logicalTasks[Math.floor(Math.random() * logicalTasks.length)];
    return randomTask.task;
  },
  
  solveTask: async (task: string) => {
    const matchingTask = logicalTasks.find(t => t.task === task);
    if (matchingTask) {
      return matchingTask.solution;
    }
    
    // Fallback for tasks not in our predefined list
    return "The solution requires analyzing the logical structure of the problem and applying appropriate rules of inference.";
  },
  
  verifySolution: async (task: string, solution: string) => {
    const matchingTask = logicalTasks.find(t => t.task === task);
    
    if (!matchingTask) {
      return "Cannot verify: unknown task.";
    }
    
    // Check if solution is correct (simplified check)
    const expectedSolution = matchingTask.solution;
    const solutionCorrect = solution.toLowerCase().includes(expectedSolution.toLowerCase()) || 
                           expectedSolution.toLowerCase().includes(solution.toLowerCase());
    
    return solutionCorrect ? matchingTask.verification : "Incorrect. The solution does not match the expected reasoning pattern.";
  },
  
  reflect: async (task: string, solution: string, verification: string) => {
    const matchingTask = logicalTasks.find(t => t.task === task);
    
    if (matchingTask) {
      return matchingTask.reflection;
    }
    
    // Generic reflection
    return "This task tests logical reasoning abilities. The key is to identify the logical structure and apply the appropriate rules of inference while avoiding common fallacies.";
  },
  
  mutateTask: async (task: string, previousSteps: string[]) => {
    // Use verification result to determine if we should increase difficulty
    const success = previousSteps.some(step => step.includes('Correct'));
    
    if (success) {
      // Increase difficulty by applying a mutation pattern
      const randomMutation = mutationPatterns[Math.floor(Math.random() * mutationPatterns.length)];
      return randomMutation(task);
    } else {
      // Try a different task of similar difficulty
      const newTask = logicalTasks.find(t => t.task !== task);
      return newTask ? newTask.task : logicalTasks[0].task;
    }
  }
};
