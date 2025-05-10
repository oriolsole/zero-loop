
// This file contains the Supabase integration functions for the intelligence loop

import { LoopHistory, KnowledgeNode, KnowledgeEdge, SupabaseSchema } from '../types/intelligence';
import { supabase, isSupabaseConfigured } from './supabase-client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Log a completed learning loop to Supabase
 */
export async function logLoopToSupabase(loop: LoopHistory): Promise<boolean> {
  try {
    // Skip if not configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured. Would log loop to Supabase:', loop);
      return false;
    }

    // Convert the loop metadata to a format compatible with Supabase's Json type
    const metadataJson = {
      total_time: loop.totalTime,
      steps: JSON.parse(JSON.stringify(loop.steps)),
      insights: loop.insights ? JSON.parse(JSON.stringify(loop.insights)) : []
    };

    const { error } = await supabase
      .from('learning_loops')
      .insert({
        id: loop.id,
        domain_id: loop.domainId,
        task: loop.steps.find(s => s.type === 'task')?.content || '',
        solution: loop.steps.find(s => s.type === 'solution')?.content || '',
        verification: loop.steps.find(s => s.type === 'verification')?.content || '',
        reflection: loop.steps.find(s => s.type === 'reflection')?.content || '',
        success: loop.success,
        score: loop.score,
        created_at: new Date(loop.timestamp).toISOString(),
        metadata: metadataJson
      });

    if (error) {
      console.error('Error logging loop to Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception logging loop to Supabase:', error);
    return false;
  }
}

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

    const { error } = await supabase
      .from('knowledge_nodes')
      .insert({
        id: node.id,
        title: node.title,
        description: node.description,
        type: node.type,
        domain_id: node.domain || '',
        discovered_in_loop: node.discoveredInLoop,
        confidence: node.confidence || 0.7,
        created_at: new Date(node.timestamp || Date.now()).toISOString(),
        metadata: metadataJson
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

    const { error } = await supabase
      .from('knowledge_edges')
      .insert({
        id: edge.id,
        source_id: edge.source,
        target_id: edge.target,
        type: edge.type,
        strength: edge.strength,
        label: edge.label || '',
        created_at: new Date().toISOString(),
        metadata: metadataJson
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

/**
 * Sync local data with Supabase
 */
export async function syncWithSupabase(
  loops: LoopHistory[], 
  nodes: KnowledgeNode[], 
  edges: KnowledgeEdge[]
): Promise<{
  success: boolean;
  stats: { loops: number; nodes: number; edges: number; failures: number }
}> {
  try {
    // Skip if not configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured. Would sync data with Supabase');
      return { 
        success: false, 
        stats: { loops: 0, nodes: 0, edges: 0, failures: 0 } 
      };
    }

    const stats = {
      loops: 0,
      nodes: 0,
      edges: 0,
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

    return {
      success: stats.failures === 0,
      stats
    };
  } catch (error) {
    console.error('Error syncing with Supabase:', error);
    return {
      success: false,
      stats: { loops: 0, nodes: 0, edges: 0, failures: 1 }
    };
  }
}

// Schema definition for reference (matches the tables created in Supabase)
export const supabaseSchema = {
  tables: {
    learning_loops: `
      id uuid primary key,
      domain_id text not null,
      task text not null,
      solution text not null,
      verification text not null, 
      reflection text not null,
      success boolean not null,
      score integer not null,
      created_at timestamp with time zone default now(),
      metadata jsonb,
      user_id uuid references auth.users
    `,
    knowledge_nodes: `
      id uuid primary key,
      title text not null,
      description text not null,
      type text not null,
      domain_id text not null,
      discovered_in_loop integer not null,
      confidence numeric not null,
      created_at timestamp with time zone default now(),
      metadata jsonb,
      user_id uuid references auth.users
    `,
    knowledge_edges: `
      id uuid primary key,
      source_id uuid references knowledge_nodes(id) not null,
      target_id uuid references knowledge_nodes(id) not null,
      type text not null,
      strength numeric not null,
      label text,
      created_at timestamp with time zone default now(),
      user_id uuid references auth.users
    `
  }
};
