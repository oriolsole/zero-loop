
import { v4 as uuidv4 } from 'uuid';
import { Domain, LearningStep, KnowledgeNode, KnowledgeEdge } from '../types/intelligence';

/**
 * Template domains used for initializing new users
 * These are meant to be created in the database, not kept in local state
 */
export const getTemplateDomains = (): Domain[] => {
  return [
    {
      id: uuidv4(),
      name: 'Logical Reasoning',
      shortDesc: 'Formal reasoning and inference rules',
      description: 'This domain focuses on propositional and predicate logic, inference rules, and logical proofs. The system learns to identify valid arguments, logical fallacies, and efficient proof strategies.',
      totalLoops: 0,
      currentLoop: [],
      knowledgeNodes: [],
      knowledgeEdges: [],
      metrics: {
        successRate: 0,
        knowledgeGrowth: [{ name: 'Start', nodes: 0 }],
        taskDifficulty: [{ name: 'Start', difficulty: 1, success: 1 }],
        skills: [{ name: 'Propositional Logic', level: 10 }]
      }
    },
    {
      id: uuidv4(),
      name: 'Programming Concepts',
      shortDesc: 'Algorithms, data structures, and optimization',
      description: 'This domain covers programming patterns, algorithm design, complexity analysis, and code optimization. The system learns to identify efficient solutions and common programming pitfalls.',
      totalLoops: 0,
      currentLoop: [],
      knowledgeNodes: [],
      knowledgeEdges: [],
      metrics: {
        successRate: 0,
        knowledgeGrowth: [{ name: 'Start', nodes: 0 }],
        taskDifficulty: [{ name: 'Start', difficulty: 1, success: 1 }],
        skills: [{ name: 'Algorithm Design', level: 10 }]
      }
    },
    {
      id: uuidv4(),
      name: 'Mathematical Reasoning',
      shortDesc: 'Linear algebra, calculus, and statistics',
      description: 'This domain focuses on mathematical problem-solving, including linear algebra, calculus, statistics, and numerical methods. The system learns to apply appropriate techniques to different types of problems.',
      totalLoops: 0,
      currentLoop: [],
      knowledgeNodes: [],
      knowledgeEdges: [],
      metrics: {
        successRate: 0,
        knowledgeGrowth: [{ name: 'Start', nodes: 0 }],
        taskDifficulty: [{ name: 'Start', difficulty: 1, success: 1 }],
        skills: [{ name: 'Linear Algebra', level: 10 }]
      }
    },
    {
      id: uuidv4(),
      name: 'AI Reasoning',
      shortDesc: 'Learn using AI-powered reasoning',
      description: 'This domain uses AI reasoning to generate tasks, solutions, and insights. It leverages large language models to create a more dynamic and adaptive learning experience.',
      totalLoops: 0,
      currentLoop: [],
      knowledgeNodes: [],
      knowledgeEdges: [],
      metrics: {
        successRate: 0,
        knowledgeGrowth: [{ name: 'Start', nodes: 0 }],
        taskDifficulty: [{ name: 'Start', difficulty: 1, success: 1 }],
        skills: [{ name: 'AI Reasoning', level: 10 }]
      }
    }
  ];
};

/**
 * Create an empty domain with the given properties
 */
export const createEmptyDomain = (
  name: string,
  shortDesc: string,
  description: string
): Domain => {
  return {
    id: uuidv4(),
    name,
    shortDesc,
    description,
    totalLoops: 0,
    currentLoop: [],
    knowledgeNodes: [],
    knowledgeEdges: [],
    metrics: {
      successRate: 0,
      knowledgeGrowth: [{ name: 'Start', nodes: 0 }],
      taskDifficulty: [{ name: 'Start', difficulty: 1, success: 1 }],
      skills: [{ name: 'Learning', level: 10 }]
    }
  };
};

/**
 * Create a new default learning step template
 */
export const getEmptyLearningSteps = (): LearningStep[] => {
  return [
    {
      type: 'task',
      title: 'New Task',
      description: 'Define a new problem or task',
      status: 'pending',
      content: '',
      metrics: {
        complexity: 'Low',
        timeSpent: '0.0s'
      }
    },
    {
      type: 'solution',
      title: 'Solution Approach',
      description: 'Formulate a solution to the task',
      status: 'pending',
      content: '',
      metrics: {
        approach: 'Pending',
        confidence: '0%'
      }
    },
    {
      type: 'verification',
      title: 'Verification',
      description: 'Verify the solution is correct',
      status: 'pending',
      content: '',
      metrics: {
        passedTests: '0/0',
        verificationTime: '0.0s'
      }
    },
    {
      type: 'reflection',
      title: 'Reflection',
      description: 'Analyze the process and extract insights',
      status: 'pending',
      content: '',
      metrics: {
        newInsights: 0,
        similarProblems: 0
      }
    },
    {
      type: 'mutation',
      title: 'Task Mutation',
      description: 'Adapt the task for future learning',
      status: 'pending',
      content: '',
      metrics: {
        difficultyIncrease: '0%',
        novelty: 'Low'
      }
    }
  ];
};
