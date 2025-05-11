
import { KnowledgeEdge } from '../../types/intelligence';
import { supabase, isSupabaseConfigured } from '../supabase-client';
import { isValidUUID } from './helpers';
import { v4 as uuidv4 } from 'uuid';

/**
 * Save a knowledge edge to Supabase
 */
export async function saveKnowledgeEdgeToSupabase(edge: KnowledgeEdge): Promise<boolean> {
  try {
    // Skip if not configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured. Would save knowledge edge to Supabase:', edge);
      return false;
    }

    // Convert edge metadata to a format compatible with Json type
    // Using JSON.parse(JSON.stringify()) to ensure deep cloning and proper JSON conversion
    const metadataJson = JSON.parse(JSON.stringify({
      similarity_score: edge.similarityScore || edge.strength,
      validated: edge.validated || false,
      creation_method: edge.creationMethod || 'automatic'
    }));

    // Ensure all IDs are valid UUIDs
    const edgeId = isValidUUID(edge.id) ? edge.id : uuidv4();
    const sourceId = isValidUUID(edge.source) ? edge.source : uuidv4();
    const targetId = isValidUUID(edge.target) ? edge.target : uuidv4();

    // Get the current user ID for the insertion if available
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const { error } = await supabase
      .from('knowledge_edges')
      .insert({
        id: edgeId,
        source_id: sourceId,
        target_id: targetId,
        type: edge.type,
        strength: edge.strength,
        label: edge.label || '',
        created_at: new Date().toISOString(),
        metadata: metadataJson,
        user_id: userId
      });

    if (error) {
      console.error('Error saving knowledge edge to Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception saving knowledge edge to Supabase:', error);
    return false;
  }
}
