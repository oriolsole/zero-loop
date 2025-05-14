
// Domain engines - implementations for different domains

import { DomainEngine } from '../types/intelligence';
import { logicalReasoningEngine } from './logicalReasoning';
import { regexPatternsEngine } from './regexPatterns';
import { webKnowledgeEngine } from './webKnowledgeEngine';
import { aiReasoningEngine } from './aiReasoningEngine';

// Registry of all available domain engines
export const domainEngines: Record<string, DomainEngine> = {
  'logic': logicalReasoningEngine,
  'programming': regexPatternsEngine,
  'web-knowledge': webKnowledgeEngine,
  'ai-reasoning': aiReasoningEngine, // Add the new AI reasoning engine
  'math': {
    generateTask: async () => 'Solve for x: 2x + 5 = 13',
    solveTask: async () => 'x = 4',
    verifySolution: async () => ({ isCorrect: true, explanation: 'Correct! 2(4) + 5 = 13' }),
    reflect: async () => 'This was a simple linear equation that required isolating the variable. Key insight: Moving constants to the right side by subtraction first makes solving cleaner.',
    mutateTask: async (task, solution, verification, reflection) => 'Solve for x: 3x - 7 = 20'
  },
  'writing': {
    generateTask: async () => 'Write a short paragraph about climate change.',
    solveTask: async () => 'Climate change presents one of the most significant global challenges of our time. Rising temperatures, extreme weather events, and shifting ecosystems all point to the urgent need for coordinated action. By reducing carbon emissions and embracing sustainable practices, we can work toward mitigating its most severe impacts.',
    verifySolution: async () => ({ isCorrect: true, explanation: 'Concise, informative paragraph that covers key points about climate change.' }),
    reflect: async () => 'The paragraph effectively presents the problem and suggests solutions without being overly technical. Key insight: Balance between problem description and solution is important for persuasive writing.',
    mutateTask: async (task, solution, verification, reflection) => 'Write a short paragraph comparing renewable and non-renewable energy sources.'
  },
  'business': {
    generateTask: async () => 'Outline a go-to-market strategy for a new productivity app.',
    solveTask: async () => 'The go-to-market strategy will focus on: 1) Initial product launch targeting remote workers via social media and productivity forums 2) Free tier with premium upgrade path 3) Partnerships with established workflow tools 4) Content marketing emphasizing productivity gains 5) Targeted ads on professional networks',
    verifySolution: async () => ({ isCorrect: true, explanation: 'Good strategy, covers key channels and target audience. Missing specific KPIs.' }),
    reflect: async () => 'The strategy has solid distribution channels but needs more specific success metrics and competitive differentiation. Key insight: Always include measurable KPIs in go-to-market strategies to track effectiveness.',
    mutateTask: async (task, solution, verification, reflection) => 'Develop a customer retention strategy for a subscription-based SaaS product.'
  }
};
