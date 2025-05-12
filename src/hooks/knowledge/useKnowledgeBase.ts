
import { useKnowledgeUpload } from './useKnowledgeUpload';
import { useKnowledgeQuery } from './useKnowledgeQuery';
import { useKnowledgeEnrich } from './useKnowledgeEnrich';
import { ExternalSource, FileUploadProgress, KnowledgeQueryOptions, KnowledgeUploadOptions } from './types';

/**
 * Main hook for accessing and managing the knowledge base
 * Combines upload, query, and enrichment capabilities
 */
export function useKnowledgeBase() {
  const { uploadKnowledge, isUploading, uploadError, uploadProgress } = useKnowledgeUpload();
  const { queryKnowledgeBase, isQuerying, queryError, recentResults } = useKnowledgeQuery();
  const { enrichWithKnowledge, verifyWithKnowledge } = useKnowledgeEnrich();
  
  return {
    // Upload capabilities
    uploadKnowledge,
    isUploading,
    uploadError,
    uploadProgress,
    
    // Query capabilities
    queryKnowledgeBase,
    isQuerying,
    queryError,
    recentResults,
    
    // Enrichment capabilities
    enrichWithKnowledge,
    verifyWithKnowledge
  };
}

// Re-export types
export type { ExternalSource, FileUploadProgress, KnowledgeQueryOptions, KnowledgeUploadOptions };
