
/**
 * Options for querying the knowledge base
 */
export interface KnowledgeQueryOptions {
  query: string;
  limit?: number;
  useEmbeddings?: boolean;
  matchThreshold?: number;
  includeNodes?: boolean;  // New parameter to include knowledge nodes
}

/**
 * External knowledge source
 */
export interface ExternalSource {
  title: string;
  link?: string;
  snippet: string;
  source: string;
  publisher?: string;
  thumbnailUrl?: string;
  date?: string;
  fileFormat?: string;
  contentType?: string;
  relevanceScore?: number;
  fileType?: string | null;
  filePath?: string | null;
  fileUrl?: string | null;
  metadata?: any;
  sourceType?: 'knowledge' | 'web' | 'node';  // Added 'node' as a source type
  nodeType?: string;  // Added for knowledge nodes
  confidence?: number;  // Added for knowledge nodes
}

/**
 * Progress information for file uploads
 */
export interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  id?: string;
}

/**
 * Options for uploading knowledge
 */
export interface KnowledgeUploadOptions {
  title: string;
  content?: string;
  file?: File;
  sourceUrl?: string;
  domainId?: string;
  metadata?: Record<string, any>;
}
