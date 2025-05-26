
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool-progress';
  content: string;
  timestamp: Date;
  toolsUsed?: any[];
  selfReflection?: string;
  toolDecision?: any;
  messageType?: 'analysis' | 'planning' | 'execution' | 'response' | 'tool-update';
  isStreaming?: boolean;
  toolProgress?: any[];
}

export interface ConversationSession {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export const useAgentConversation = () => {
  const { user } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);

  const generateSessionTitle = (firstMessage: string): string => {
    const truncated = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...' 
      : firstMessage;
    return truncated;
  };

  const startNewSession = useCallback(async () => {
    if (!user) return;

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(sessionId);
    setConversations([]);
    
    const newSession: ConversationSession = {
      id: sessionId,
      title: 'New Conversation',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    setSessions(prev => [newSession, ...prev]);
  }, [user]);

  const addMessage = useCallback(async (message: ConversationMessage) => {
    if (!currentSessionId || !user) return;

    setConversations(prev => [...prev, message]);

    // Update session title if this is the first user message
    if (message.role === 'user' && conversations.length === 0) {
      const title = generateSessionTitle(message.content);
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { ...session, title, updated_at: new Date() }
          : session
      ));
    }

    try {
      await supabase
        .from('agent_conversations')
        .insert({
          session_id: currentSessionId,
          user_id: user.id,
          role: message.role,
          content: message.content,
          message_type: message.messageType,
          tools_used: message.toolsUsed,
          self_reflection: message.selfReflection,
          tool_decision: message.toolDecision,
          tool_progress: message.toolProgress,
          timestamp: message.timestamp.toISOString()
        });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }, [currentSessionId, user, conversations.length]);

  const updateMessage = useCallback((messageId: string, updates: Partial<ConversationMessage>) => {
    setConversations(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    setCurrentSessionId(sessionId);
    
    try {
      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const messages: ConversationMessage[] = data.map(row => ({
        id: row.id.toString(),
        role: row.role as ConversationMessage['role'],
        content: row.content,
        timestamp: new Date(row.timestamp),
        messageType: row.message_type,
        toolsUsed: row.tools_used,
        selfReflection: row.self_reflection,
        toolDecision: row.tool_decision,
        toolProgress: row.tool_progress
      }));

      setConversations(messages);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }, [user]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('agent_conversations')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setConversations([]);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }, [user, currentSessionId]);

  const getConversationHistory = useCallback(() => {
    return conversations.filter(msg => msg.role === 'user' || msg.role === 'assistant').map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }, [conversations]);

  // Initialize with a new session if none exists
  React.useEffect(() => {
    if (user && !currentSessionId) {
      startNewSession();
    }
  }, [user, currentSessionId, startNewSession]);

  return {
    currentSessionId,
    conversations,
    sessions,
    startNewSession,
    loadSession,
    addMessage,
    updateMessage,
    deleteSession,
    getConversationHistory
  };
};
