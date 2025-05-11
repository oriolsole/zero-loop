
// Re-export all functions from the various supabase utility files

// Helper utilities
export { isValidUUID, safeJsonSerialize } from './helpers';

// Learning loop operations
export { logLoopToSupabase } from './loopOperations';

// Knowledge node operations
export { saveKnowledgeNodeToSupabase } from './nodeOperations';

// Knowledge edge operations
export { saveKnowledgeEdgeToSupabase } from './edgeOperations';

// Domain operations
export { 
  saveDomainToSupabase,
  updateDomainInSupabase,
  loadDomainsFromSupabase,
  deleteDomainFromSupabase,
  domainExistsInSupabase
} from './domainOperations';

// Sync operations
export { syncWithSupabase } from './syncOperations';

// Schema reference
export { supabaseSchema } from './schemaReference';
