import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

/**
 * Utility to clean up duplicate tool execution messages
 */
export async function cleanupDuplicateToolMessages(
  userId: string,
  sessionId: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  try {
    console.log(`🧹 Cleaning up duplicate tool messages for session: ${sessionId}`);
    
    // Get all tool execution messages for this session
    const { data: toolMessages, error } = await supabase
      .from('agent_conversations')
      .select('id, content, created_at')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('message_type', 'tool-executing')
      .order('created_at', { ascending: true });
    
    if (error || !toolMessages) {
      console.error('Failed to fetch tool messages for cleanup:', error);
      return;
    }
    
    const toolCallGroups = new Map<string, any[]>();
    
    // Group messages by toolCallId
    for (const message of toolMessages) {
      try {
        const parsedContent = JSON.parse(message.content);
        if (parsedContent.toolCallId) {
          const toolCallId = parsedContent.toolCallId;
          if (!toolCallGroups.has(toolCallId)) {
            toolCallGroups.set(toolCallId, []);
          }
          toolCallGroups.get(toolCallId)!.push({
            ...message,
            parsedContent
          });
        }
      } catch (e) {
        // Skip invalid JSON messages
      }
    }
    
    const messagesToDelete: string[] = [];
    
    // For each tool call group, keep only the most recent or completed message
    for (const [toolCallId, messages] of toolCallGroups) {
      if (messages.length <= 1) continue; // No duplicates
      
      console.log(`🔍 Found ${messages.length} messages for tool call: ${toolCallId}`);
      
      // Sort by status priority (completed > failed > executing) and then by creation time
      messages.sort((a, b) => {
        const statusPriority = { completed: 3, failed: 2, executing: 1 };
        const aPriority = statusPriority[a.parsedContent.status] || 0;
        const bPriority = statusPriority[b.parsedContent.status] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        // If same status, keep the most recent
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Keep the first (best) message, mark others for deletion
      const toKeep = messages[0];
      const toDelete = messages.slice(1);
      
      console.log(`📌 Keeping message ${toKeep.id} (${toKeep.parsedContent.status})`);
      toDelete.forEach(msg => {
        console.log(`🗑️ Marking for deletion: ${msg.id} (${msg.parsedContent.status})`);
        messagesToDelete.push(msg.id);
      });
    }
    
    // Delete duplicate messages
    if (messagesToDelete.length > 0) {
      console.log(`🗑️ Deleting ${messagesToDelete.length} duplicate tool messages`);
      
      const { error: deleteError } = await supabase
        .from('agent_conversations')
        .delete()
        .in('id', messagesToDelete);
      
      if (deleteError) {
        console.error('Failed to delete duplicate messages:', deleteError);
      } else {
        console.log(`✅ Successfully deleted ${messagesToDelete.length} duplicate messages`);
      }
    } else {
      console.log('✅ No duplicate tool messages found');
    }
    
  } catch (error) {
    console.error('Error during message cleanup:', error);
  }
}

/**
 * Check if a tool message with the same toolCallId already exists
 */
export async function toolMessageExists(
  toolCallId: string,
  userId: string,
  sessionId: string,
  loopIteration: number,
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  if (!toolCallId || !userId || !sessionId) return null;
  
  try {
    const { data, error } = await supabase
      .from('agent_conversations')
      .select('id, content')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('message_type', 'tool-executing')
      .eq('loop_iteration', loopIteration)
      .gte('created_at', new Date(Date.now() - 300000).toISOString()); // Check last 5 minutes
    
    if (error || !data) return null;
    
    // Check if any message contains this toolCallId
    for (const msg of data) {
      try {
        const parsedContent = JSON.parse(msg.content);
        if (parsedContent.toolCallId === toolCallId) {
          return msg.id;
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
    
    return null;
  } catch {
    return null;
  }
}
