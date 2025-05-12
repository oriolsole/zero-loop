
// This file re-exports the useKnowledgeBase hook and its types
// from the new modular structure
import { useKnowledgeBase } from './knowledge/useKnowledgeBase';
import type { ExternalSource, FileUploadProgress, KnowledgeQueryOptions, KnowledgeUploadOptions } from './knowledge/types';

export { useKnowledgeBase };
export type { ExternalSource, FileUploadProgress, KnowledgeQueryOptions, KnowledgeUploadOptions };
