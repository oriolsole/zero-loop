
/**
 * Message management utilities for storing and updating conversation messages
 */

export class MessageManager {
  private userId: string | null;
  private sessionId: string | null;
  private supabase: any;
  private loopIteration: number;
  private agentId?: string;

  constructor(
    userId: string | null,
    sessionId: string | null,
    supabase: any,
    loopIteration: number,
    agentId?: string
  ) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.supabase = supabase;
    this.loopIteration = loopIteration;
    this.agentId = agentId;
  }

  /**
   * Check if message already exists in database
   */
  async messageExists(content: string, messageType: string, loopIter: number): Promise<boolean> {
    if (!this.userId || !this.sessionId) return false;
    
    try {
      const { data, error } = await this.supabase
        .from('agent_conversations')
        .select('id')
        .eq('user_id', this.userId)
        .eq('session_id', this.sessionId)
        .eq('content', content)
        .eq('message_type', messageType)
        .eq('loop_iteration', loopIter)
        .gte('created_at', new Date(Date.now() - 10000).toISOString())
        .maybeSingle();
      
      return !error && data !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check if tool message exists by toolCallId
   */
  async toolMessageExistsByCallId(toolCallId: string, loopIter: number): Promise<string | null> {
    if (!this.userId || !this.sessionId || !toolCallId) return null;
    
    try {
      const { data, error } = await this.supabase
        .from('agent_conversations')
        .select('id, content')
        .eq('user_id', this.userId)
        .eq('session_id', this.sessionId)
        .eq('message_type', 'tool-executing')
        .eq('loop_iteration', loopIter)
        .gte('created_at', new Date(Date.now() - 60000).toISOString());
      
      if (error || !data) return null;
      
      for (const msg of data) {
        try {
          const parsedContent = JSON.parse(msg.content);
          if (parsedContent.toolCallId === toolCallId) {
            console.log(`🔍 Found existing tool message for call ID ${toolCallId}: ${msg.id}`);
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

  /**
   * Insert message with duplicate prevention
   */
  async insertMessage(content: string, messageType: string, additionalData: any = {}): Promise<string | null> {
    if (!this.userId || !this.sessionId) return null;
    
    const exists = await this.messageExists(content, messageType, this.loopIteration);
    if (exists) {
      console.log(`⚠️ Message already exists: ${messageType} (loop ${this.loopIteration})`);
      return null;
    }
    
    try {
      const { data, error } = await this.supabase.from('agent_conversations').insert({
        user_id: this.userId,
        session_id: this.sessionId,
        role: 'assistant',
        content,
        message_type: messageType,
        loop_iteration: this.loopIteration,
        agent_id: this.agentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...additionalData
      }).select('id').single();
      
      if (error) {
        console.error(`❌ Failed to insert message: ${messageType}`, error);
        return null;
      }
      
      console.log(`✅ Inserted message: ${messageType} (loop ${this.loopIteration}) with ID: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error(`❌ Failed to insert message: ${messageType}`, error);
      return null;
    }
  }

  /**
   * Update existing message with better error handling
   */
  async updateMessage(messageId: string, content: string, additionalData: any = {}): Promise<boolean> {
    if (!this.userId || !this.sessionId || !messageId) {
      console.error('❌ Missing required parameters for message update');
      return false;
    }
    
    try {
      console.log(`🔄 Updating message ${messageId} with new content`);
      
      const { error } = await this.supabase
        .from('agent_conversations')
        .update({
          content,
          updated_at: new Date().toISOString(),
          ...additionalData
        })
        .eq('id', messageId)
        .eq('user_id', this.userId)
        .eq('session_id', this.sessionId);
      
      if (error) {
        console.error(`❌ Failed to update message: ${messageId}`, error);
        return false;
      }
      
      console.log(`✅ Successfully updated message: ${messageId}`);
      return true;
    } catch (error) {
      console.error(`❌ Exception updating message: ${messageId}`, error);
      return false;
    }
  }
}
