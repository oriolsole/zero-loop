
import { KnowledgeNode } from '../../types/intelligence';
import { supabase, isSupabaseConfigured } from '../supabase-client';
import { isValidUUID } from './helpers';
import { v4 as uuidv4 } from 'uuid';

/**
 * Save a knowledge node to Supabase
 */
export async function saveKnowledgeNodeToSupabase(node: KnowledgeNode): Promise<boolean> {
  try {
    // Skip if not configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured. Would save knowledge node to Supabase:', node);
      return false;
    }

    // Convert node metadata to a format compatible with Json type
    // Making sure to deep clone and stringify any complex objects to avoid type issues
    const metadataJson = JSON.parse(JSON.stringify({
      position: node.position,
      size: node.size,
      connections: node.connections,
      source_insights: node.sourceInsights || [],
      quality_metrics: node.qualityMetrics || {
        impact: Math.random() * 10,
        novelty: Math.random() * 10,
        validation_status: 'unverified'
      }
    }));

    // Ensure ID is a valid UUID (not string ID)
    const nodeId = isValidUUID(node.id) ? node.id : uuidv4();

    // Get the current user ID for the insertion if available
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const { error } = await supabase
      .from('knowledge_nodes')
      .insert({
        id: nodeId,
        title: node.title,
        description: node.description,
        type: node.type,
        domain_id: node.domain || '',
        discovered_in_loop: node.discoveredInLoop,
        confidence: node.confidence || 0.7,
        created_at: new Date(node.timestamp || Date.now()).toISOString(),
        metadata: metadataJson,
        user_id: userId
      });

    if (error) {
      console.error('Error saving knowledge node to Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception saving knowledge node to Supabase:', error);
    return false;
  }
}
