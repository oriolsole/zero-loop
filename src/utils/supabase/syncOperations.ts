
import { LoopHistory, KnowledgeNode, KnowledgeEdge, Domain } from '../../types/intelligence';
import { logLoopToSupabase } from './loopOperations';
import { saveKnowledgeNodeToSupabase } from './nodeOperations';
import { saveKnowledgeEdgeToSupabase } from './edgeOperations';
import { saveDomainToSupabase, updateDomainInSupabase, domainExistsInSupabase } from './domainOperations';
import { isValidUUID } from './helpers';
import { isSupabaseConfigured } from '../supabase-client';

/**
 * Sync local data with Supabase
 */
export async function syncWithSupabase(
  loops: LoopHistory[], 
  nodes: KnowledgeNode[], 
  edges: KnowledgeEdge[],
  domains: Domain[]
): Promise<{
  success: boolean;
  stats: { loops: number; nodes: number; edges: number; domains: number; failures: number }
}> {
  try {
    // Skip if not configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured. Would sync data with Supabase');
      return { 
        success: false, 
        stats: { loops: 0, nodes: 0, edges: 0, domains: 0, failures: 0 } 
      };
    }

    const stats = {
      loops: 0,
      nodes: 0,
      edges: 0,
      domains: 0,
      failures: 0
    };

    // Sync loops
    for (const loop of loops) {
      const success = await logLoopToSupabase(loop);
      if (success) {
        stats.loops++;
      } else {
        stats.failures++;
      }
    }

    // Sync nodes
    for (const node of nodes) {
      const success = await saveKnowledgeNodeToSupabase(node);
      if (success) {
        stats.nodes++;
      } else {
        stats.failures++;
      }
    }

    // Sync edges
    for (const edge of edges) {
      const success = await saveKnowledgeEdgeToSupabase(edge);
      if (success) {
        stats.edges++;
      } else {
        stats.failures++;
      }
    }

    // Sync domains
    for (const domain of domains) {
      try {
        // For existing domains, update; for new ones, save
        let success: boolean;
        if (isValidUUID(domain.id) && await domainExistsInSupabase(domain.id)) {
          success = await updateDomainInSupabase(domain);
        } else {
          success = await saveDomainToSupabase(domain);
        }
        
        if (success) {
          stats.domains++;
        } else {
          stats.failures++;
        }
      } catch (error) {
        console.error('Error syncing domain:', domain.id, error);
        stats.failures++;
      }
    }

    return {
      success: stats.failures === 0,
      stats
    };
  } catch (error) {
    console.error('Error syncing with Supabase:', error);
    return {
      success: false,
      stats: { loops: 0, nodes: 0, edges: 0, domains: 0, failures: 1 }
    };
  }
}
