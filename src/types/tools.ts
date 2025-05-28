
export interface BaseToolItem {
  id: string;
  name: string;
  status: 'pending' | 'starting' | 'executing' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
}

export interface ToolProgressItem extends BaseToolItem {
  displayName: string;
  progress?: number;
  estimatedDuration?: number;
}

export interface Tool extends BaseToolItem {
  progress: number;
  success?: boolean;
}

export interface KnowledgeToolResult {
  name: 'knowledge_retrieval' | 'learning_generation';
  parameters: Record<string, any>;
  result: {
    sources?: Array<{
      id?: string;
      title: string;
      snippet: string;
      relevanceScore?: number;
      sourceType?: string;
      nodeType?: string;
      metadata?: any;
    }>;
    searchType?: string;
    totalResults?: number;
    returnedResults?: number;
    message?: string;
    nodeId?: string;
    insights?: string;
    complexity?: string;
    iterations?: number;
    persistenceStatus?: 'persisted' | 'failed';
  };
  success: boolean;
}

export interface ConversationContext {
  lastGitHubRepo?: {
    owner: string;
    repo: string;
    url: string;
    analyzedAt: Date;
  };
  lastSearchQuery?: {
    query: string;
    results: any[];
    searchedAt: Date;
  };
  toolResults: Map<string, any>;
  conversationSummary?: string;
}
