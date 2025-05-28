
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationContext } from '@/contexts/ConversationContext';
import { ConversationMessage } from '@/hooks/useAgentConversation';

export const useMessagePersistence = () => {
  const { user } = useAuth();
  const { 
    messages, 
    setMessages, 
    currentSession, 
    currentSessionId 
  } = useConversationContext();

  // Helper function to safely convert tools_used from database
  const convertToolsUsed = useCallback((toolsUsed: any): Array<{name: string; success: boolean; result?: any; error?: string;}> => {
    if (!toolsUsed) return [];
    
    if (typeof toolsUsed === 'string') {
      try {
        toolsUsed = JSON.parse(toolsUsed);
      } catch {
        return [];
      }
    }
    
    if (!Array.isArray(toolsUsed)) return [];
    
    return toolsUsed.map((tool: any) => {
      if (typeof tool === 'object' && tool !== null) {
        return {
          name: tool.name || 'Unknown Tool',
          success: Boolean(tool.success),
          result: tool.result,
          error: tool.error
        };
      }
      return {
        name: 'Unknown Tool',
        success: false,
        error: 'Invalid tool data'
      };
    });
  }, []);

  const loadConversation = useCallback(async (sessionId: string) => {
    if (!user) return;

    console.log(`📂 Loading session: ${sessionId}`);
    
    try {
      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log(`📄 Loaded ${data?.length || 0} messages for session ${sessionId}`);

      const loadedMessages: ConversationMessage[] = (data || []).map(row => ({
        id: row.id.toString(),
        role: row.role as ConversationMessage['role'],
        content: row.content,
        timestamp: new Date(row.created_at),
        messageType: row.message_type as ConversationMessage['messageType'] || undefined,
        toolsUsed: convertToolsUsed(row.tools_used),
        selfReflection: row.self_reflection || undefined,
        toolDecision: row.tool_decision && typeof row.tool_decision === 'object' ? 
          row.tool_decision as { reasoning: string; selectedTools: string[]; } : undefined,
        aiReasoning: row.ai_reasoning || undefined,
        loopIteration: row.loop_iteration || 0,
        improvementReasoning: row.improvement_reasoning || undefined,
        shouldContinueLoop: row.should_continue_loop || undefined
      }));

      setMessages(loadedMessages);
      console.log(`✅ Successfully loaded ${loadedMessages.length} messages for session ${sessionId}`);
      
    } catch (error) {
      console.error(`❌ Error loading session ${sessionId}:`, error);
      setMessages([]);
    }
  }, [user, convertToolsUsed, setMessages]);

  const addMessage = useCallback(async (message: ConversationMessage) => {
    const sessionId = currentSession?.id || currentSessionId;
    
    if (!sessionId || !user) {
      console.error('❌ No session or user available for message persistence');
      return;
    }

    console.log(`➕ Adding message to session ${sessionId}:`, message.id);

    // Check if message already exists in context to prevent duplicates
    const existsInContext = messages.some(m => m.id === message.id);
    if (existsInContext) {
      console.log(`⚠️ Message ${message.id} already exists in context, skipping`);
      return;
    }

    // Update context state immediately for better UX
    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    console.log(`✅ Message ${message.id} added to context`);

    // Save to database with the new unique constraints handling duplicates
    try {
      console.log(`💾 Inserting message to database:`, {
        sessionId,
        userId: user.id,
        role: message.role,
        contentLength: message.content.length,
        messageType: message.messageType,
        timestamp: message.timestamp.toISOString()
      });

      const { error } = await supabase
        .from('agent_conversations')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          role: message.role,
          content: message.content,
          message_type: message.messageType || null,
          tools_used: message.toolsUsed || null,
          self_reflection: message.selfReflection || null,
          tool_decision: message.toolDecision || null,
          ai_reasoning: message.aiReasoning || null,
          loop_iteration: message.loopIteration || 0,
          improvement_reasoning: message.improvementReasoning || null,
          should_continue_loop: message.shouldContinueLoop || null,
          created_at: message.timestamp.toISOString()
        });

      if (error) {
        console.error('❌ Error saving message:', error);
        // Remove from local state if database save failed (unless it's a duplicate constraint error)
        if (!error.message.includes('unique constraint') && !error.message.includes('duplicate')) {
          const filteredMessages = messages.filter(m => m.id !== message.id);
          setMessages(filteredMessages);
        } else {
          console.log('💡 Duplicate constraint prevented insertion - this is expected and good');
        }
      } else {
        console.log(`💾 Message ${message.id} saved to database successfully`);
      }
    } catch (error) {
      console.error('❌ Exception saving message:', error);
      // Remove from local state on error
      const filteredMessages = messages.filter(m => m.id !== message.id);
      setMessages(filteredMessages);
    }
  }, [currentSession, currentSessionId, user, messages, setMessages]);

  const refreshConversationState = useCallback(async () => {
    const sessionId = currentSession?.id || currentSessionId;
    
    if (!sessionId || !user) return;

    try {
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const sinceTime = lastMessage ? lastMessage.timestamp.toISOString() : new Date(Date.now() - 60000).toISOString();

      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .gt('created_at', sinceTime)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        const newMessages = data.map(row => ({
          id: row.id.toString(),
          role: row.role as ConversationMessage['role'],
          content: row.content,
          timestamp: new Date(row.created_at),
          messageType: row.message_type as ConversationMessage['messageType'] || undefined,
          toolsUsed: convertToolsUsed(row.tools_used),
          loopIteration: row.loop_iteration || 0,
          improvementReasoning: row.improvement_reasoning || undefined,
          shouldContinueLoop: row.should_continue_loop || undefined
        }));

        // Filter out messages that already exist in context to prevent duplicates
        const existingIds = new Set(messages.map(m => m.id));
        const actuallyNewMessages = newMessages.filter(m => !existingIds.has(m.id));

        if (actuallyNewMessages.length > 0) {
          const updatedMessages = [...messages, ...actuallyNewMessages];
          setMessages(updatedMessages);
          console.log(`🔄 Added ${actuallyNewMessages.length} new messages from refresh`);
        }
      }
    } catch (error) {
      console.warn('Error refreshing conversation:', error);
    }
  }, [currentSession, currentSessionId, user, messages, convertToolsUsed, setMessages]);

  return {
    loadConversation,
    addMessage,
    refreshConversationState
  };
};
