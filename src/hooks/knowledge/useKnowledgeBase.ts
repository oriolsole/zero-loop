
// This file re-exports the useKnowledgeBase hook from the new modular structure
import { useKnowledgeBase as useFeatureKnowledgeBase } from '@/features/knowledge/hooks/useKnowledgeBase';

export function useKnowledgeBase() {
  const knowledgeBase = useFeatureKnowledgeBase();
  
  return {
    ...knowledgeBase,
    // Ensure all methods from the feature-based implementation are exposed
    queryKnowledge: knowledgeBase.queryKnowledge,
    queryKnowledgeBase: knowledgeBase.queryKnowledgeBase,
  };
}

export type { 
  ExternalSource, 
  FileUploadProgress, 
  KnowledgeQueryOptions, 
  KnowledgeUploadOptions 
} from '@/features/knowledge/types';
