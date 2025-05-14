
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
