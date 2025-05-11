
import { LoopHistory } from '../../types/intelligence';
import { supabase, isSupabaseConfigured } from '../supabase-client';
import { isValidUUID } from './helpers';
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

    // Validate loop data before sending to Supabase
    if (!loop.id || !loop.domainId || !loop.steps || loop.steps.length === 0) {
      console.error('Invalid loop data', { loop });
      return false;
    }

    console.log('Preparing to save loop to Supabase:', { id: loop.id, domainId: loop.domainId });

    // Convert the loop metadata to a format compatible with Supabase's Json type
    const metadataJson = {
      total_time: loop.totalTime,
      steps: JSON.parse(JSON.stringify(loop.steps)),
      insights: loop.insights ? JSON.parse(JSON.stringify(loop.insights)) : []
    };

    // Ensure we have a valid UUID for the loop ID
    const loopId = isValidUUID(loop.id) ? loop.id : uuidv4();

    // Extract task, solution, verification, and reflection content from steps
    const task = loop.steps.find(s => s.type === 'task')?.content || '';
    const solution = loop.steps.find(s => s.type === 'solution')?.content || '';
    const verification = loop.steps.find(s => s.type === 'verification')?.content || '';
    const reflection = loop.steps.find(s => s.type === 'reflection')?.content || '';

    console.log('Task content length:', task.length);
    console.log('Solution content length:', solution.length);
    console.log('Verification content length:', verification.length);
    console.log('Reflection content length:', reflection.length);

    // Get the current user ID for the insertion if available
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const { data, error } = await supabase
      .from('learning_loops')
      .insert({
        id: loopId,
        domain_id: loop.domainId,
        task: task,
        solution: solution,
        verification: verification,
        reflection: reflection,
        success: loop.success,
        score: loop.score,
        created_at: new Date(loop.timestamp).toISOString(),
        metadata: metadataJson,
        user_id: userId
      })
      .select();

    if (error) {
      console.error('Error logging loop to Supabase:', error);
      if (error.details) console.error('Error details:', error.details);
      if (error.hint) console.error('Error hint:', error.hint);
      return false;
    }
    
    console.log('Successfully saved loop to Supabase:', data);
    return true;
  } catch (error) {
    console.error('Exception logging loop to Supabase:', error);
    return false;
  }
}
