
export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  domain_id?: string | null;
  source_url?: string | null;
  created_at: string;
  file_size?: number | null;
  original_file_type?: string | null;
  file_path?: string | null;
  thumbnail_path?: string | null;
  metadata?: Record<string, any> | null;
}

export interface KnowledgeSearchResult {
  id: string;
  title: string;
  content: string;
  snippet: string;
  link: string;
  source: string;
  date?: string;
  relevanceScore?: number;
  fileType?: string;
  fileUrl?: string;
  public_url?: string;
}

export interface FileUploadProgress {
  status: 'pending' | 'processing' | 'embedding' | 'saving' | 'complete' | 'error';
  progress: number;
  message?: string;
}

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

export type ExternalSource = {
  title: string;
  link: string;
  snippet: string;
  source: string;
  date?: string;
  id?: string;
  timestamp?: number;
  relevanceScore?: number;
  fileType?: string;
  fileUrl?: string;
  public_url?: string;
}

export interface KnowledgeLibraryFilters {
  domainId?: string;
  fileType?: string;
  searchQuery?: string;
  sortBy?: 'created_at' | 'title';
  sortDirection?: 'asc' | 'desc';
}
