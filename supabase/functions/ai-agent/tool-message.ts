
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

/**
 * Creates a tool execution message in the database to track tool usage
 */
export async function createToolExecutionMessage(
  toolCall: any,
  toolName: string,
  userId: string,
  sessionId: string,
  loopIteration: number,
  supabase: ReturnType<typeof createClient>
): Promise<{ id: string } | null> {
  try {
    console.log(`📝 Creating tool execution message for ${toolName} (loop ${loopIteration})`);
    
    const messageContent = `🛠️ Using ${toolName}...`;
    
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        content: messageContent,
        role: 'tool',
        user_id: userId,
        session_id: sessionId,
        message_type: 'tool-execution',
        tool_call_id: toolCall.id,
        tool_name: toolName,
        loop_iteration: loopIteration
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Failed to create tool execution message:', error);
      return null;
    }

    console.log(`✅ Created tool execution message: ${message.id}`);
    return message;
  } catch (error) {
    console.error('❌ Error creating tool execution message:', error);
    return null;
  }
}
