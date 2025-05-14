
// Define the external source interface
export interface ExternalSource {
  title: string;
  link?: string;
  snippet: string;
  source: string;
  date?: string;
  sourceType?: 'knowledge' | 'web';
}

export interface QueryKnowledgeRequest {
  query: string;
  limit?: number;
  useEmbeddings?: boolean; 
  matchThreshold?: number;
}

export interface QueryKnowledgeResponse {
  results: ExternalSource[];
  error?: string;
}

// Missing interfaces causing build errors
export interface Domain {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  engineType?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface LearningStep {
  id: string;
  type: 'task' | 'solution' | 'verification' | 'reflection' | 'mutation';
  content: string;
  domainId?: string;
  loopId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  status?: 'pending' | 'complete' | 'error';
  sources?: ExternalSource[];
}

export interface LoopHistory {
  id: string;
  domainId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'error';
  metadata?: Record<string, any>;
}

export interface KnowledgeNode {
  id: string;
  content: string;
  type: string;
  domainId?: string;
  loopId?: string;
  confidence?: number;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  strength?: number;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface QualityMetrics {
  accuracy?: number;
  relevance?: number;
  novelty?: number;
  coherence?: number;
  overall?: number;
}

export interface DomainEngine {
  generateTask: (domainId: string, previousSteps?: LearningStep[]) => Promise<string>;
  generateSolution: (task: string, domainId: string) => Promise<string>;
  verifyResult: (task: string, solution: string, domainId: string) => Promise<{ isCorrect: boolean; explanation: string }>;
  reflect: (task: string, solution: string, verification: string, domainId: string) => Promise<string>;
  mutateTask: (task: string, solution: string, verification: string, reflection: string, domainId: string) => Promise<string>;
}
