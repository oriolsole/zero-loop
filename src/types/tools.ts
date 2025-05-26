
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
