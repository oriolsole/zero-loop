
import { ExternalSource as BaseExternalSource } from '@/types/intelligence';

export type FileUploadProgress = {
  status: 'pending' | 'processing' | 'embedding' | 'saving' | 'complete' | 'error';
  progress: number;
  message?: string;
};

export interface KnowledgeUploadOptions {
  title: string;
  content?: string;
  file?: File;
  metadata?: Record<string, any>;
  domainId?: string;
  sourceUrl?: string;
  chunkSize?: number;
  overlap?: number;
}

export interface KnowledgeQueryOptions {
  query: string;
  limit?: number;
  useEmbeddings?: boolean;
  matchThreshold?: number;
}

export type ExternalSource = BaseExternalSource;
