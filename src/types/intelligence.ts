
// Define the external source interface
export interface ExternalSource {
  title: string;
  link?: string;
  snippet: string;
  source: string;
  date?: string;
  sourceType?: 'knowledge' | 'web' | 'node';  // Updated to include 'node' type
  // New fields for enhanced search results
  contentType?: string;
  thumbnailUrl?: string;
  fileFormat?: string;
  description?: string;
  publisher?: string;
  fileType?: string;
  fileUrl?: string;
  // New fields for knowledge nodes
  nodeType?: string;
  confidence?: number;
  // Add relevance score for search results
  relevanceScore?: number;
}

export interface QueryKnowledgeRequest {
  query: string;
  limit?: number;
  useEmbeddings?: boolean; 
  matchThreshold?: number;
  includeNodes?: boolean;  // Added for node search
}

export interface QueryKnowledgeResponse {
  results: ExternalSource[];
  error?: string;
}

// Domain interface
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
  // Current loop stores an array of learning steps
  currentLoop?: LearningStep[];
  metrics?: QualityMetrics;
  knowledgeNodes?: KnowledgeNode[];
  knowledgeEdges?: KnowledgeEdge[];
  totalLoops?: number;
  shortDesc?: string;
}

// Learning step interface
export interface LearningStep {
  id: string;
  type: 'task' | 'solution' | 'verification' | 'reflection' | 'mutation';
  content: string;
  domainId?: string;
  loopId?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  status?: 'pending' | 'complete' | 'error' | 'success' | 'failure' | 'warning';
  sources?: ExternalSource[];
  title?: string;
  description?: string;
  metrics?: {
    accuracy?: number;
    relevance?: number;
    novelty?: number;
    overall?: number;
    loopNumber?: number | string;
    timeMs?: number;
    correct?: boolean;
    insightCount?: number;
    complexity?: number;
    // Additional metrics used in templateData
    approach?: string;
    passedTests?: number;
    newInsights?: number;
  };
}

export interface LoopHistory {
  id: string;
  domainId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'error';
  metadata?: Record<string, any>;
  // Additional properties needed by components
  timestamp?: number;
  insights?: any[];
  steps?: LearningStep[];
  success?: boolean;
  score?: number;
  totalTime?: number;
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
  // Additional properties needed by components
  title?: string;
  description?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number } | number;
  discoveredInLoop?: string | number;
  connections?: KnowledgeEdge[] | number;
  domain?: string;
  timestamp?: number;
  sourceInsights?: string[];
  loopReference?: string;
  qualityMetrics?: QualityMetrics;
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
  // Additional properties needed by components
  source?: string;
  target?: string;
  label?: string;
  similarityScore?: number;
  validated?: boolean;
  creationMethod?: string;
}

export interface QualityMetrics {
  accuracy?: number;
  relevance?: number;
  novelty?: number;
  coherence?: number;
  overall?: number;
  successRate?: number;
  knowledgeGrowth?: { name: string; nodes: number }[];
  taskDifficulty?: { name: string; difficulty: number; success: number }[];
  skills?: { name: string; level: number }[];
  impact?: number;
  validation_status?: string;
}

// Add DomainEngineMetadata interface for engine definitions
export interface DomainEngineMetadata {
  id: string;
  name: string;
  description: string;
  icon: any; // Changed from string to any to allow React components
  sources?: string[];
  color?: string;
  capabilities?: string[];
  category?: string;
  version?: string;
  author?: string;
}

// Update DomainEngine interface to match the implementation
export interface DomainEngine {
  generateTask: (domainId?: string, previousSteps?: LearningStep[]) => Promise<string>;
  solveTask: (task: string, options?: any) => Promise<any>;
  verifyTask?: (task: string, solution: any) => Promise<{ result: boolean; explanation: string; score: number }>;
  reflectOnTask?: (task: string, solution: any, verification: any) => Promise<{ reflection: string; insights: string[] }>;
  mutateTask?: (task: string, solution: any, verification: any, reflection: any) => Promise<string>;
}
