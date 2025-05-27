import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { KnowledgeToolResult } from '@/types/tools';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageType?: 'status' | 'response' | 'error';
  toolsUsed?: any[];
  learningInsights?: KnowledgeToolResult[];
  aiReasoning?: string;
}

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useAgentConversation() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading sessions:', error);
      } else {
        setSessions(data || []);
      }
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (currentSessionId) {
      loadConversationHistory(currentSessionId);
    }
  }, [currentSessionId]);

  const loadConversationHistory = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading conversation history:', error);
      } else {
        setConversations(data.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const startNewSession = async () => {
    if (!user) return;

    const newSessionTitle = `Session ${sessions.length + 1}`;

    const { data, error } = await supabase
      .from('sessions')
      .insert([{ user_id: user.id, title: newSessionTitle }])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating new session:', error);
    } else {
      setSessions(prevSessions => [data, ...prevSessions]);
      setCurrentSessionId(data.id);
      setConversations([]);
    }
  };

  const loadSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const addMessage = async (message: ConversationMessage) => {
    if (!user || !currentSessionId) return;

    setConversations(prev => [...prev, message]);

    const { error } = await supabase
      .from('messages')
      .insert([{
        session_id: currentSessionId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        messageType: message.messageType,
        toolsUsed: message.toolsUsed,
        aiReasoning: message.aiReasoning
      }]);

    if (error) {
      console.error('Error saving message:', error);
    }
  };

  const updateMessage = async (messageId: string, updates: Partial<ConversationMessage>) => {
    setConversations(prev => {
      return prev.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, ...updates };
        }
        return msg;
      });
    });

    const { error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', messageId);

    if (error) {
      console.error('Error updating message:', error);
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
  
    // Optimistically update the UI
    setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setConversations([]);
    }
  
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);
  
    if (error) {
      console.error('Error deleting session:', error);
      // Revert the UI update if the deletion failed
      loadSessions();
    }
  };

  return {
    currentSessionId,
    conversations,
    sessions,
    isLoadingSessions,
    startNewSession,
    loadSession,
    addMessage,
    updateMessage,
    getConversationHistory,
    deleteSession
  };
}
