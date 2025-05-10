
export interface Domain {
  id: string;
  name: string;
  shortDesc: string;
  description: string;
  totalLoops: number;
  currentLoop: LearningStep[];
  knowledgeNodes: KnowledgeNode[];
  knowledgeEdges: KnowledgeEdge[];
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

export interface QualityMetrics {
  impact: number;          // 0-10 rating of how impactful this insight is
  novelty: number;         // 0-10 rating of how novel the insight is
  validation_status: 'unverified' | 'verified' | 'disputed';
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
  confidence?: number;
  domain?: string;
  timestamp?: number;
  // New fields for Phase 4.2
  sourceInsights?: string[];  // IDs of insights this node builds upon
  loopReference?: string;     // ID of the loop that produced this insight
  qualityMetrics?: QualityMetrics;
}

export interface KnowledgeEdge {
  id: string;
  source: string; // Source node id
  target: string; // Target node id
  type: 'builds-on' | 'contradicts' | 'related-to' | 'generalizes';
  strength: number; // 0-1 value representing connection strength
  label?: string;
  // New fields for Phase 4.2
  similarityScore?: number;
  validated?: boolean;
  creationMethod?: 'automatic' | 'manual' | 'suggested';
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
  insights?: Array<{
    text: string;
    confidence: number;
    nodeIds?: string[];
  }>;
}

export interface SupabaseSchema {
  learning_loops: {
    id: string;
    domain_id: string;
    task: string;
    solution: string;
    verification: string;
    reflection: string;
    success: boolean;
    score: number;
    created_at: string;
    metadata: any;
    user_id?: string;
  };
  knowledge_nodes: {
    id: string;
    title: string;
    description: string;
    type: string;
    domain_id: string;
    discovered_in_loop: number;
    confidence: number;
    created_at: string;
    metadata: any;
    user_id?: string;
  };
  knowledge_edges: {
    id: string;
    source_id: string;
    target_id: string;
    type: string;
    strength: number;
    label?: string;
    created_at: string;
    user_id?: string;
  };
}
