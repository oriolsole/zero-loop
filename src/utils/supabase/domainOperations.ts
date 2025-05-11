
import { Domain } from '../../types/intelligence';
import { supabase, isSupabaseConfigured } from '../supabase-client';
import { isValidUUID } from './helpers';

/**
 * Save a domain to Supabase
 */
export async function saveDomainToSupabase(domain: Domain): Promise<boolean> {
  try {
    // Skip if not configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured. Would save domain to Supabase:', domain);
      return false;
    }

    console.log('Beginning domain save to Supabase:', { id: domain.id, name: domain.name });

    // Validate domain ID
    if (!domain.id) {
      console.error('Invalid domain: missing ID');
      return false;
    }

    // Check if the ID is a valid UUID
    if (!isValidUUID(domain.id)) {
      console.error('Invalid domain ID for Supabase: Not a UUID format', domain.id);
      return false;
    }

    // Prepare domain metadata (metrics, etc.)
    const metadataJson = JSON.parse(JSON.stringify({
      metrics: domain.metrics,
      current_loop: domain.currentLoop
    }));

    console.log('Domain prepared for Supabase:', { 
      id: domain.id,
      name: domain.name,
      totalLoops: domain.totalLoops,
      hasMetrics: !!domain.metrics,
      metadataSize: JSON.stringify(metadataJson).length
    });

    // Get the current user ID for the insertion
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Create the domain object for insertion
    const { error } = await supabase
      .from('domains')
      .insert({
        id: domain.id,
        name: domain.name,
        short_desc: domain.shortDesc,
        description: domain.description,
        total_loops: domain.totalLoops,
        metadata: metadataJson,
        updated_at: new Date().toISOString(),
        user_id: userId
      });

    if (error) {
      console.error('Error saving domain to Supabase:', error);
      if (error.details) console.error('Error details:', error.details);
      if (error.hint) console.error('Error hint:', error.hint);
      if (error.code) console.error('Error code:', error.code);
      return false;
    }
    
    console.log('Successfully saved domain to Supabase:', domain.name);
    return true;
  } catch (error) {
    console.error('Exception saving domain to Supabase:', error);
    return false;
  }
}

/**
 * Update an existing domain in Supabase
 */
export async function updateDomainInSupabase(domain: Domain): Promise<boolean> {
  try {
    // Skip if not configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured. Would update domain in Supabase:', domain);
      return false;
    }

    // Skip if no valid ID
    if (!domain.id || !isValidUUID(domain.id)) {
      console.error('Invalid domain ID for update:', domain.id);
      return false;
    }

    // Prepare domain metadata (metrics, etc.)
    const metadataJson = JSON.parse(JSON.stringify({
      metrics: domain.metrics,
      current_loop: domain.currentLoop
    }));

    // Get the current user ID for the update
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const { error } = await supabase
      .from('domains')
      .update({
        name: domain.name,
        short_desc: domain.shortDesc,
        description: domain.description,
        total_loops: domain.totalLoops,
        metadata: metadataJson,
        updated_at: new Date().toISOString(),
        user_id: userId
      })
      .eq('id', domain.id);

    if (error) {
      console.error('Error updating domain in Supabase:', error);
      return false;
    }
    
    console.log('Successfully updated domain in Supabase:', domain.name);
    return true;
  } catch (error) {
    console.error('Exception updating domain in Supabase:', error);
    return false;
  }
}

/**
 * Load domains from Supabase
 */
export async function loadDomainsFromSupabase(): Promise<Domain[]> {
  try {
    // Skip if not configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured. Would load domains from Supabase');
      return [];
    }

    // Get the current user ID to filter domains
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // If authenticated, filter by user_id, otherwise return public domains
    let query = supabase.from('domains').select('*').order('updated_at', { ascending: false });
    
    // If user is authenticated, filter by their user ID
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      // For anonymous users, only return domains with null user_id (public domains)
      query = query.is('user_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading domains from Supabase:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No domains found in Supabase');
      return [];
    }
    
    // Convert Supabase domain format to app domain format
    const domains: Domain[] = data.map(item => {
      // Initialize with default values
      const defaultMetrics = {
        successRate: 0,
        knowledgeGrowth: [{ name: 'Start', nodes: 0 }],
        taskDifficulty: [{ name: 'Start', difficulty: 1, success: 1 }],
        skills: [{ name: 'Learning', level: 1 }]
      };
      
      // Safely extract metadata - ensure it's an object and not a string or other type
      const metadata = typeof item.metadata === 'object' && item.metadata !== null 
        ? item.metadata 
        : {};
      
      // Extract currentLoop and convert each item to LearningStep type
      let currentLoop: any[] = [];
      if (metadata && 'current_loop' in metadata && Array.isArray(metadata.current_loop)) {
        currentLoop = metadata.current_loop.map((step: any) => ({
          type: step.type || 'task',
          title: step.title || '',
          description: step.description || '',
          status: step.status || 'pending',
          content: step.content || '',
          metrics: step.metrics || undefined
        }));
      }
      
      // Safely extract metrics
      const metrics = metadata && 'metrics' in metadata && typeof metadata.metrics === 'object'
        ? metadata.metrics as Domain['metrics'] 
        : defaultMetrics;
      
      return {
        id: item.id,
        name: item.name,
        shortDesc: item.short_desc || '',
        description: item.description || '',
        totalLoops: item.total_loops || 0,
        currentLoop: currentLoop,
        knowledgeNodes: [], // These will be loaded separately
        knowledgeEdges: [], // These will be loaded separately
        metrics: metrics,
        userId: item.user_id // Add user ID to the domain object
      };
    });
    
    console.log(`Loaded ${domains.length} domains from Supabase for user: ${userId || 'anonymous'}`);
    return domains;
  } catch (error) {
    console.error('Exception loading domains from Supabase:', error);
    return [];
  }
}

/**
 * Delete a domain from Supabase
 */
export async function deleteDomainFromSupabase(domainId: string): Promise<boolean> {
  try {
    // Skip if not configured
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured. Would delete domain from Supabase:', domainId);
      return false;
    }

    // Skip if no valid ID
    if (!domainId || !isValidUUID(domainId)) {
      console.error('Invalid domain ID for deletion:', domainId);
      return false;
    }

    // Get the current user ID
    const { data: { user } } = await supabase.auth.getUser();

    // If user is authenticated, we need to make sure they only delete their own domains
    let query = supabase.from('domains').delete();
    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      // For anonymous users, only delete domains with null user_id
      query = query.is('user_id', null);
    }

    const { error } = await query.eq('id', domainId);

    if (error) {
      console.error('Error deleting domain from Supabase:', error);
      return false;
    }
    
    console.log('Successfully deleted domain from Supabase:', domainId);
    return true;
  } catch (error) {
    console.error('Exception deleting domain from Supabase:', error);
    return false;
  }
}

/**
 * Check if a domain exists in Supabase
 */
export async function domainExistsInSupabase(domainId: string): Promise<boolean> {
  try {
    if (!isSupabaseConfigured() || !isValidUUID(domainId)) {
      return false;
    }
    
    const { data, error } = await supabase
      .from('domains')
      .select('id')
      .eq('id', domainId)
      .single();
      
    if (error || !data) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
