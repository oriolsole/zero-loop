
import { Domain } from "@/types/intelligence";

/**
 * Knowledge item data structure
 */
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

/**
 * Search result from the knowledge base
 */
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

/**
 * Knowledge upload progress status
 */
export interface UploadProgress {
  status: 'pending' | 'processing' | 'embedding' | 'saving' | 'complete' | 'error';
  progress: number;
  message?: string;
}

/**
 * Options for uploading knowledge
 */
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

/**
 * Options for querying knowledge
 */
export interface KnowledgeQueryOptions {
  query: string;
  limit?: number;
  useEmbeddings?: boolean;
  matchThreshold?: number;
}

/**
 * Filters for listing knowledge items
 */
export interface KnowledgeLibraryFilters {
  domainId?: string;
  fileType?: string;
  searchQuery?: string;
  sortBy?: 'created_at' | 'title';
  sortDirection?: 'asc' | 'desc';
}
