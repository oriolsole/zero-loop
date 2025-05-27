
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { KnowledgeToolResult } from '@/types/tools';
import { toast } from '@/components/ui/sonner';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageType?: 'status' | 'response' | 'error';
  toolsUsed?: any[];
  learningInsights?: KnowledgeToolResult[];
  aiReasoning?: string;
  toolDecision?: {
    reasoning: string;
    selectedTools?: string[];
  };
  selfReflection?: string;
  followUpSuggestions?: string[];
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messageCount?: number;
}

export function useAgentConversation() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;
    
    setIsLoadingSessions(true);
    try {
      console.log('Loading sessions for user:', user.id);
      
      // Use raw SQL query to get sessions from the new table
      const { data: sessionData, error: sessionError } = await supabase
        .rpc('get_user_sessions' as any, { user_id: user.id })
        .catch(async () => {
          // Fallback: Create sessions from existing conversations
          console.log('Fallback: Creating sessions from conversations');
          const { data: convData, error: convError } = await supabase
            .from('agent_conversations')
            .select('session_id, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (convError) throw convError;

          // Group conversations by session_id
          const sessionMap = new Map();
          convData?.forEach(conv => {
            if (!sessionMap.has(conv.session_id)) {
              sessionMap.set(conv.session_id, {
                id: conv.session_id,
                title: `Chat Session`,
                created_at: conv.created_at,
                updated_at: conv.created_at,
                messageCount: 1
              });
            } else {
              const session = sessionMap.get(conv.session_id);
              session.messageCount += 1;
            }
          });

          return { data: Array.from(sessionMap.values()), error: null };
        });

      if (sessionError) {
        console.error('Error loading sessions:', sessionError);
        toast.error('Failed to load chat sessions');
        return;
      }

      console.log('Loaded sessions:', sessionData);
      setSessions(sessionData || []);
      
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load chat sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (currentSessionId) {
      loadConversationHistory(currentSessionId);
    } else {
      setConversations([]);
    }
  }, [currentSessionId]);

  const loadConversationHistory = async (sessionId: string) => {
    if (!user) return;
    
    try {
      console.log('Loading conversation history for session:', sessionId);
      
      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading conversation history:', error);
        toast.error('Failed to load conversation history');
        return;
      }

      console.log('Loaded conversations:', data);
      
      setConversations(data?.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        messageType: msg.message_type as 'status' | 'response' | 'error' | undefined,
        toolsUsed: msg.tools_used as any[],
        learningInsights: (msg.learning_insights as unknown) as KnowledgeToolResult[],
        aiReasoning: msg.ai_reasoning || undefined,
        toolDecision: msg.tool_decision as any,
        selfReflection: msg.self_reflection || undefined
      })) || []);
      
    } catch (error) {
      console.error('Error loading conversation history:', error);
      toast.error('Failed to load conversation history');
    }
  };

  const startNewSession = async () => {
    if (!user) {
      console.error('No user found when trying to start new session');
      toast.error('Please sign in to start a new chat');
      return;
    }

    setIsCreatingSession(true);
    
    try {
      console.log('Creating new session for user:', user.id);
      
      // Generate a new session ID
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const sessionTitle = `Chat Session ${sessions.length + 1}`;
      
      // Try to insert into sessions table, fall back to just creating locally
      try {
        const { error: sessionError } = await supabase.rpc('create_session' as any, {
          session_id: newSessionId,
          session_title: sessionTitle,
          user_id: user.id
        });

        if (sessionError) {
          console.log('Sessions table not available, using fallback approach');
        }
      } catch (error) {
        console.log('Using fallback session creation');
      }
      
      // Update local state
      setCurrentSessionId(newSessionId);
      setConversations([]);
      
      // Add to sessions list
      const newSession: Session = {
        id: newSessionId,
        title: sessionTitle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messageCount: 0
      };
      
      setSessions(prevSessions => [newSession, ...prevSessions]);
      toast.success('New chat session created');
      
    } catch (error) {
      console.error('Error creating new session:', error);
      toast.error('Failed to create new chat session');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    console.log('Loading session:', sessionId);
    setCurrentSessionId(sessionId);
  };

  const addMessage = async (message: ConversationMessage) => {
    if (!user || !currentSessionId) {
      console.error('Cannot add message: missing user or session');
      toast.error('Please start a new chat session first');
      return;
    }

    // Optimistically update UI
    setConversations(prev => [...prev, message]);

    try {
      const { error } = await supabase
        .from('agent_conversations')
        .insert({
          session_id: currentSessionId,
          role: message.role,
          content: message.content,
          created_at: message.timestamp.toISOString(),
          message_type: message.messageType,
          tools_used: message.toolsUsed || [],
          learning_insights: message.learningInsights as any || [],
          ai_reasoning: message.aiReasoning,
          tool_decision: message.toolDecision as any,
          self_reflection: message.selfReflection,
          user_id: user.id
        });

      if (error) {
        console.error('Error saving message:', error);
        // Revert optimistic update
        setConversations(prev => prev.filter(msg => msg.id !== message.id));
        toast.error('Failed to save message');
        return;
      }

      // Update session message count locally
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === currentSessionId
            ? { ...session, messageCount: (session.messageCount || 0) + 1, updated_at: new Date().toISOString() }
            : session
        )
      );
      
    } catch (error) {
      console.error('Error saving message:', error);
      // Revert optimistic update
      setConversations(prev => prev.filter(msg => msg.id !== message.id));
      toast.error('Failed to save message');
    }
  };

  const updateMessage = async (messageId: string, updates: Partial<ConversationMessage>) => {
    // Optimistically update UI
    setConversations(prev => {
      return prev.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, ...updates };
        }
        return msg;
      });
    });

    try {
      const { error } = await supabase
        .from('agent_conversations')
        .update({
          content: updates.content,
          message_type: updates.messageType,
          tools_used: updates.toolsUsed as any,
          learning_insights: updates.learningInsights as any,
          ai_reasoning: updates.aiReasoning,
          tool_decision: updates.toolDecision as any,
          self_reflection: updates.selfReflection
        })
        .eq('id', messageId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating message:', error);
        toast.error('Failed to update message');
      }
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    }
  };

  const getConversationHistory = () => {
    return conversations.map(message => ({
      role: message.role,
      content: message.content
    }));
  };

  const deleteSession = async (sessionId: string) => {
    if (!user) return;

    try {
      // Delete conversations for this session
      const { error: conversationError } = await supabase
        .from('agent_conversations')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      if (conversationError) {
        console.error('Error deleting conversations:', conversationError);
        toast.error('Failed to delete session conversations');
        return;
      }

      // Try to delete from sessions table if it exists
      try {
        await supabase.rpc('delete_session' as any, {
          session_id: sessionId,
          user_id: user.id
        });
      } catch (error) {
        console.log('Sessions table deletion not available, continuing...');
      }

      // Update UI
      setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setConversations([]);
      }

      toast.success('Session deleted successfully');
      
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  return {
    currentSessionId,
    conversations,
    sessions,
    isLoadingSessions,
    isCreatingSession,
    startNewSession,
    loadSession,
    addMessage,
    updateMessage,
    getConversationHistory,
    deleteSession
  };
}
