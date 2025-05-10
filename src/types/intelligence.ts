
export interface Domain {
  id: string;
  name: string;
  shortDesc: string;
  description: string;
  totalLoops: number;
  currentLoop: LearningStep[];
  knowledgeNodes: KnowledgeNode[];
  metrics: {
    successRate: number;
    knowledgeGrowth: Array<{name: string; nodes: number}>;
    taskDifficulty: Array<{name: string; difficulty: number; success: number}>;
    skills: Array<{name: string; level: number}>;
  };
}

export interface LearningStep {
  type: 'task' | 'solution' | 'verification' | 'reflection' | 'mutation';
  title: string;
  description: string;
  status: 'success' | 'failure' | 'pending' | 'warning';
  content: string;
  metrics?: {
    [key: string]: string | number;
  };
}

export interface KnowledgeNode {
  id: string;
  title: string;
  description: string;
  type: 'rule' | 'concept' | 'pattern' | 'insight';
  discoveredInLoop: number;
  connections?: string[];
  position: {
    x: number;
    y: number;
  };
  size?: number;
}

export interface DomainEngine {
  generateTask: () => Promise<string>;
  solveTask: (task: string) => Promise<string>;
  verifySolution: (task: string, solution: string) => Promise<string>;
  reflect: (task: string, solution: string, verification: string) => Promise<string>;
  mutateTask: (task: string, previousSteps: string[]) => Promise<string>;
}

export interface LoopHistory {
  id: string;
  domainId: string;
  steps: LearningStep[];
  timestamp: number;
  totalTime: number;
  success: boolean;
  score: number;
}
