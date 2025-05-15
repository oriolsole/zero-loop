
import { DomainEngine } from '../types/intelligence';
import { Calculator } from 'lucide-react';

// Predefined math tasks and solutions
const mathTasks = [
  {
    task: "Solve for x: 2x + 5 = 13",
    solution: "x = 4",
    verification: "Correct! 2(4) + 5 = 13",
    reflection: "This was a simple linear equation that required isolating the variable. Key insight: Moving constants to the right side by subtraction first makes solving cleaner."
  },
  {
    task: "Solve for x: 3x - 7 = 20",
    solution: "x = 9",
    verification: "Correct! 3(9) - 7 = 27 - 7 = 20",
    reflection: "This linear equation requires isolating the variable by first adding 7 to both sides and then dividing by 3."
  },
  {
    task: "Find the derivative of f(x) = 3x² + 2x - 5",
    solution: "f'(x) = 6x + 2",
    verification: "Correct! The derivative of 3x² is 6x, the derivative of 2x is 2, and the derivative of -5 is 0.",
    reflection: "This task tests understanding of basic differentiation rules: power rule and constants."
  },
  {
    task: "Calculate the area of a circle with radius 5 units",
    solution: "A = 78.54 square units",
    verification: "Correct! A = πr² = π(5)² = 25π ≈ 78.54 square units",
    reflection: "This problem applies the formula for the area of a circle: A = πr². When working with π, it's often useful to keep it as π in the exact answer and provide the decimal approximation."
  },
  {
    task: "Solve the system of equations: { x + y = 5 | 2x - y = 4 }",
    solution: "x = 3, y = 2",
    verification: "Correct! Substituting x = 3 and y = 2: 3 + 2 = 5 ✓ and 2(3) - 2 = 6 - 2 = 4 ✓",
    reflection: "This system can be solved by elimination or substitution. Using substitution, we can write y = 5 - x from the first equation and substitute into the second, which gives 2x - (5 - x) = 4, leading to 3x = 9, so x = 3 and y = 2."
  }
];

// Mutation patterns to generate new math tasks
const mathMutationPatterns = [
  (task: string) => task.includes('2x') 
    ? task.replace('2x', '3x') 
    : task.replace('3x', '4x'),
  (task: string) => task.includes('area') 
    ? task.replace('area', 'circumference') 
    : task.includes('circle') ? task.replace('circle', 'sphere') : task,
  (task: string) => task.includes('derivative') 
    ? task.replace('derivative', 'integral') 
    : task.includes('solve') ? `${task} using a different method` : task,
  (task: string) => task.includes('Solve for x') 
    ? task.replace('x', 'y') 
    : `Solve ${task} and explain your steps`,
  (task: string) => `${task.replace('?', '')} with additional constraints?`
];

export const mathEngine: DomainEngine = {
  generateTask: async () => {
    const randomTask = mathTasks[Math.floor(Math.random() * mathTasks.length)];
    return randomTask.task;
  },
  
  solveTask: async (task: string) => {
    const matchingTask = mathTasks.find(t => t.task === task);
    if (matchingTask) {
      return matchingTask.solution;
    }
    
    // Fallback for tasks not in our predefined list
    return "To solve this problem, I would need to identify the mathematical concepts involved, apply the appropriate formulas, and work through the solution step by step.";
  },
  
  verifySolution: async (task: string, solution: string) => {
    const matchingTask = mathTasks.find(t => t.task === task);
    
    if (!matchingTask) {
      return { 
        isCorrect: false, 
        explanation: "Cannot verify: unknown task. Please provide a different mathematical problem." 
      };
    }
    
    // Check if solution is correct (simplified check)
    const expectedSolution = matchingTask.solution.toLowerCase();
    const solutionLower = solution.toLowerCase();
    const solutionCorrect = solutionLower.includes(expectedSolution) || 
                           expectedSolution.includes(solutionLower);
    
    return { 
      isCorrect: solutionCorrect, 
      explanation: solutionCorrect ? matchingTask.verification : "Incorrect. The solution does not match the expected answer." 
    };
  },
  
  reflect: async (task: string, solution: string, verification: string) => {
    const matchingTask = mathTasks.find(t => t.task === task);
    
    if (matchingTask) {
      return matchingTask.reflection;
    }
    
    // Generic reflection for math problems
    return "Mathematical problem-solving involves identifying the concepts and formulas needed, applying them correctly, and verifying the solution. Practice with various problem types improves pattern recognition and solution strategies.";
  },
  
  mutateTask: async (task: string, solution: string, verification: string, reflection: string) => {
    // Use verification result to determine if we should increase difficulty
    const success = verification.includes('Correct');
    
    if (success) {
      // Increase difficulty by applying a mutation pattern
      const randomMutation = mathMutationPatterns[Math.floor(Math.random() * mathMutationPatterns.length)];
      return randomMutation(task);
    } else {
      // Try a different task of similar difficulty
      const newTask = mathTasks.find(t => t.task !== task);
      return newTask ? newTask.task : mathTasks[0].task;
    }
  }
};

// Metadata for the engine
export const mathEngineMetadata = {
  id: 'math',
  name: 'Mathematics',
  icon: Calculator,
  description: 'Solves mathematical problems and equations',
  sources: ['knowledge'],
  color: 'blue'
};
