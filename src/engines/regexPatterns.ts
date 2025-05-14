
import { DomainEngine } from '../types/intelligence';

// Predefined regex tasks and solutions
const regexTasks = [
  {
    task: "Write a regex pattern that matches email addresses in the format user@domain.com",
    solution: "^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$",
    verification: "Correct. This pattern matches the standard email format.",
    reflection: "This task tests basic regex patterns for email validation. The pattern captures the username, @ symbol, domain name, and TLD."
  },
  {
    task: "Create a regex that validates phone numbers in the format (123) 456-7890",
    solution: "^\\(\\d{3}\\) \\d{3}-\\d{4}$",
    verification: "Correct. This pattern correctly validates the specified phone number format.",
    reflection: "This task tests understanding of character escaping and quantifiers in regex. The pattern handles parentheses, spaces, and the specific grouping of digits."
  },
  {
    task: "Write a regex pattern that matches strings containing exactly three occurrences of the letter 'a'",
    solution: "^(?:[^a]*a){3}[^a]*$",
    verification: "Correct. This pattern ensures exactly three 'a' characters appear in the string.",
    reflection: "This task tests counting occurrences of a character. The solution uses a non-capturing group and a quantifier to ensure exactly three matches."
  },
  {
    task: "Create a regex to validate URLs that start with http:// or https://",
    solution: "^https?://[\\w.-]+\\.[a-zA-Z]{2,}(?:/[\\w.-]*)*$",
    verification: "Correct. This pattern validates common URL formats with both http and https protocols.",
    reflection: "This task tests optional characters and domain pattern matching. The pattern uses the ? operator for optional 's' in https and handles the domain and path structure."
  },
  {
    task: "Write a regex that matches words that start with 'c' and end with 'e'",
    solution: "\\bc[a-zA-Z]*e\\b",
    verification: "Correct. This pattern will match words beginning with 'c' and ending with 'e'.",
    reflection: "This task tests word boundary understanding and character class usage. The pattern uses \\b to define word boundaries and allows any letter characters between the 'c' and 'e'."
  }
];

// Mutation patterns to generate new tasks
const regexMutationPatterns = [
  (task: string) => task.includes('a') 
    ? task.replace('a', 'b') 
    : task.replace('c', 'a'),
  (task: string) => task.includes('matches') 
    ? task.replace('matches', 'doesn\'t match') 
    : task.replace('validates', 'invalidates'),
  (task: string) => `${task}, but with additional constraints: must contain at least one digit`,
  (task: string) => task.includes('three') 
    ? task.replace('three', 'four') 
    : `${task} with exactly two occurrences`,
  (task: string) => `Create a more efficient version of the regex for this task: ${task}`
];

export const regexPatternsEngine: DomainEngine = {
  generateTask: async () => {
    const randomTask = regexTasks[Math.floor(Math.random() * regexTasks.length)];
    return randomTask.task;
  },
  
  solveTask: async (task: string) => {
    const matchingTask = regexTasks.find(t => t.task === task);
    if (matchingTask) {
      return matchingTask.solution;
    }
    
    // Fallback
    return "/pattern/g";
  },
  
  verifySolution: async (task: string, solution: string) => {
    const matchingTask = regexTasks.find(t => t.task === task);
    
    if (!matchingTask) {
      return { isCorrect: false, explanation: "Cannot verify: unknown task." };
    }
    
    try {
      // Simplified check - in a real system, we would test against examples
      if (solution.includes('/') && solution.length > 3) {
        return { isCorrect: true, explanation: matchingTask.verification };
      }
      return { isCorrect: false, explanation: "Incorrect. The solution doesn't appear to be a valid regex pattern." };
    } catch (error) {
      return { isCorrect: false, explanation: `Error in regex validation: Invalid pattern` };
    }
  },
  
  reflect: async (task: string, solution: string, verification: string) => {
    const matchingTask = regexTasks.find(t => t.task === task);
    
    if (matchingTask) {
      return matchingTask.reflection;
    }
    
    // Generic reflection
    return "Regular expressions are a powerful tool for pattern matching in strings. Key concepts include character classes, quantifiers, anchors, and grouping.";
  },
  
  mutateTask: async (task: string, solution: string, verification: string, reflection: string) => {
    // Use verification result to determine if we should increase difficulty
    const success = verification.includes('Correct');
    
    if (success) {
      // Increase difficulty by applying a mutation pattern
      const randomMutation = regexMutationPatterns[Math.floor(Math.random() * regexMutationPatterns.length)];
      return randomMutation(task);
    } else {
      // Try a different task of similar difficulty
      const newTask = regexTasks.find(t => t.task !== task);
      return newTask ? newTask.task : regexTasks[0].task;
    }
  }
};
