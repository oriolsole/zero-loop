
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
  metadata?: {
    sources?: ExternalSource[];
    [key: string]: any;
  };
  metrics?: {
    [key: string]: string | number | ExternalSource[];
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
  metadata?: {
    fileType?: string;
    fileUrl?: string;
    isFile?: boolean;
    public_url?: string;
    [key: string]: any;
  };
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
  
  // New methods for external knowledge integration
  enrichTask?: (task: string) => Promise<{
    enrichedTask: string;
    sources: Array<{title: string; link: string; snippet: string; source: string;}>;
  }>;
  
  validateWithExternalKnowledge?: (
    task: string, 
    solution: string
  ) => Promise<{
    isValid: boolean;
    explanation: string;
    confidence: number;
    sources: Array<{title: string; link: string; snippet: string; source: string;}>;
  }>;
  
  generateInsightsFromExternalKnowledge?: (
    task: string,
    solution: string,
    verification: string
  ) => Promise<Array<{
    insight: string;
    confidence: number;
    sources: Array<{title: string; link: string; snippet: string; source: string;}>;
  }>>;
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

// New interfaces for external knowledge

export interface ExternalSource {
  title: string;
  link: string;  // Changed from url
  snippet: string;
  source: string;  // Changed from sourceName
  date?: string;   // Added as optional since it's used in ExternalSources.tsx
  id?: string;     // Made optional
  timestamp?: number;
  relevanceScore?: number;
  fileType?: string;  // Added for file support
  fileUrl?: string;   // Added for file support
  public_url?: string; // Added for Supabase storage URLs
}

export interface EnrichedKnowledge {
  originalText: string;
  enrichedText: string;
  sources: ExternalSource[];
  timestamp: number;
  confidence: number;
}

export interface SelfRewardMetrics {
  novelty: number;        // 0-1 score for how new this insight is compared to existing knowledge
  utility: number;        // 0-1 score for how useful this insight is for future tasks
  accuracy: number;       // 0-1 score for factual correctness
  consistency: number;    // 0-1 score for alignment with existing knowledge
  generalizable: number;  // 0-1 score for how widely applicable the insight is
  
  // Overall "reward signal" - weighted combination of the above metrics
  rewardSignal: number;   // 0-1 final score representing the value of this insight
  
  // Metadata about how this reward was computed
  computationMethod: 'self-evaluation' | 'external-validation' | 'hybrid';
  evaluationTimestamp: number;
}
