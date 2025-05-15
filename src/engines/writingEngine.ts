
import { DomainEngine } from '../types/intelligence';
import { FileText } from 'lucide-react';

// Predefined writing tasks and solutions
const writingTasks = [
  {
    task: "Write a short paragraph about climate change.",
    solution: "Climate change presents one of the most significant global challenges of our time. Rising temperatures, extreme weather events, and shifting ecosystems all point to the urgent need for coordinated action. By reducing carbon emissions and embracing sustainable practices, we can work toward mitigating its most severe impacts.",
    verification: "Concise, informative paragraph that covers key points about climate change.",
    reflection: "The paragraph effectively presents the problem and suggests solutions without being overly technical. Key insight: Balance between problem description and solution is important for persuasive writing."
  },
  {
    task: "Write a short paragraph comparing renewable and non-renewable energy sources.",
    solution: "Renewable energy sources like solar, wind, and hydropower offer sustainable alternatives that replenish naturally and produce minimal emissions. In contrast, non-renewable sources such as coal, oil, and natural gas, while historically reliable and energy-dense, deplete over time and contribute significantly to greenhouse gas emissions. The global energy transition involves balancing immediate economic considerations with long-term environmental sustainability.",
    verification: "Good comparison highlighting key differences between renewable and non-renewable energy sources.",
    reflection: "This paragraph uses contrast effectively to highlight the differences between the two energy source types. Key insight: When writing comparisons, organize by aspects (sustainability, availability, environmental impact) rather than describing each item separately."
  },
  {
    task: "Draft a persuasive opening paragraph for an essay on digital privacy.",
    solution: "In an age where our digital footprints extend into every aspect of our lives, the concept of privacy has been fundamentally transformed. Each click, search, and online interaction generates data that can be collected, analyzed, and monetized—often without our meaningful consent. As technology advances at an unprecedented pace, we must question whether convenience has come at too high a cost to our personal autonomy and if stronger protections are not just desirable, but necessary for preserving individual freedom in the digital era.",
    verification: "Strong opening that presents the issue clearly and builds a compelling case for the importance of digital privacy.",
    reflection: "This opening establishes the scope of the issue and creates urgency through emotional appeal. Key insight: Effective persuasive writing often begins by establishing common ground before introducing the argument."
  },
  {
    task: "Write a descriptive paragraph about a forest in autumn.",
    solution: "The forest stood transformed in autumn's embrace, a tapestry of amber, crimson, and gold. Sunlight filtered through the canopy, casting dappled shadows on the carpet of fallen leaves that crunched underfoot with each step. The air carried a crisp, earthy fragrance—a blend of damp soil and the sweet decay of vegetation returning to the earth. Occasional gusts sent leaves spiraling downward in lazy, dancing patterns, while squirrels darted between trees, frantically gathering the last acorns before winter's arrival. In this suspended moment between seasons, the forest seemed both vibrant with color and quietly preparing for its coming dormancy.",
    verification: "Excellent use of sensory details to create a vivid image of an autumn forest.",
    reflection: "This description engages multiple senses (sight, sound, smell) and uses specific imagery to create an immersive experience. Key insight: Incorporating movement and small details adds life to descriptive writing."
  },
  {
    task: "Write a concise explanation of photosynthesis for a middle school student.",
    solution: "Photosynthesis is like a plant's way of making its own food. Green plants have special cells containing chlorophyll (that's what makes them green!) which can capture energy from sunlight. The plant takes in water through its roots and carbon dioxide from the air through tiny openings in its leaves. Using sunlight energy, the plant transforms these ingredients into glucose (a type of sugar) and oxygen. The plant uses the glucose for energy to grow, while the oxygen is released into the air for us to breathe. It's basically the plant's version of cooking, except instead of a stove, it uses sunlight!",
    verification: "Clear explanation using age-appropriate language and a helpful analogy.",
    reflection: "This explanation simplifies a complex process without sacrificing accuracy, using an analogy (cooking) to make it relatable. Key insight: When explaining scientific concepts to young audiences, connecting to familiar experiences helps build understanding."
  }
];

// Mutation patterns to generate new writing tasks
const writingMutationPatterns = [
  (task: string) => task.includes('paragraph') 
    ? task.replace('paragraph', 'two paragraphs') 
    : task.replace('short', 'detailed'),
  (task: string) => task.includes('climate change') 
    ? task.replace('climate change', 'ocean pollution') 
    : task.replace('renewable', 'sustainable'),
  (task: string) => `${task} Include at least three specific examples.`,
  (task: string) => task.includes('descriptive') 
    ? task.replace('forest in autumn', 'bustling city market') 
    : task.replace('persuasive', 'informative'),
  (task: string) => task.includes('explanation') 
    ? task.replace('middle school', 'high school') 
    : `Rewrite ${task} for a different audience`
];

export const writingEngine: DomainEngine = {
  generateTask: async () => {
    const randomTask = writingTasks[Math.floor(Math.random() * writingTasks.length)];
    return randomTask.task;
  },
  
  solveTask: async (task: string) => {
    const matchingTask = writingTasks.find(t => t.task === task);
    if (matchingTask) {
      return matchingTask.solution;
    }
    
    // Fallback for tasks not in our predefined list
    return "For this writing task, I would consider the audience, purpose, and key points to communicate, then craft appropriate content with clear structure and engaging language.";
  },
  
  verifySolution: async (task: string, solution: string) => {
    const matchingTask = writingTasks.find(t => t.task === task);
    
    if (!matchingTask) {
      return { 
        isCorrect: false, 
        explanation: "Cannot verify: unknown task. Please provide a different writing prompt." 
      };
    }
    
    // For writing tasks, we'll consider any substantial solution correct
    // In a real system, this would use more sophisticated NLP evaluation
    const isSubstantial = solution.split(' ').length > 30;
    const onTopic = solution.toLowerCase().includes(task.toLowerCase().split(' ').slice(-3)[0]);
    
    const isCorrect = isSubstantial && onTopic;
    
    return { 
      isCorrect, 
      explanation: isCorrect 
        ? matchingTask.verification 
        : "The response either lacks sufficient content or doesn't address the topic adequately." 
    };
  },
  
  reflect: async (task: string, solution: string, verification: string) => {
    const matchingTask = writingTasks.find(t => t.task === task);
    
    if (matchingTask) {
      return matchingTask.reflection;
    }
    
    // Generic reflection for writing
    return "Effective writing requires understanding the purpose, audience, and context. Clear organization, appropriate tone, and specific details help communicate ideas persuasively. Revision is essential for refining ideas and improving clarity.";
  },
  
  mutateTask: async (task: string, solution: string, verification: string, reflection: string) => {
    // Use verification result to determine if we should increase difficulty
    const success = verification.includes('Good') || verification.includes('Excellent') || verification.includes('Strong');
    
    if (success) {
      // Increase difficulty by applying a mutation pattern
      const randomMutation = writingMutationPatterns[Math.floor(Math.random() * writingMutationPatterns.length)];
      return randomMutation(task);
    } else {
      // Try a different task of similar difficulty
      const newTask = writingTasks.find(t => t.task !== task);
      return newTask ? newTask.task : writingTasks[0].task;
    }
  }
};

// Metadata for the engine
export const writingEngineMetadata = {
  id: 'writing',
  name: 'Content Writing',
  icon: FileText,
  description: 'Creates and evaluates written content',
  sources: ['knowledge'],
  color: 'emerald'
};
