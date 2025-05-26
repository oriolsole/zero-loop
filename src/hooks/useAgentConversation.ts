
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsUsed?: Array<{
    name: string;
    parameters: Record<string, any>;
    success: boolean;
  }>;
  selfReflection?: string;
}

export interface ConversationSession {
  id: string;
  title: string;
  lastMessage: Date;
  messageCount: number;
}

export function useAgentConversation() {
  const { user } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate a new session ID
  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Start a new conversation session
  const startNewSession = () => {
    const newSessionId = generateSessionId();
    setCurrentSessionId(newSessionId);
    setConversations([]);
    return newSessionId;
  };

  // Load conversation history for a session
  const loadSession = async (sessionId: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messages: ConversationMessage[] = (data || []).map(row => ({
        id: row.id,
        role: row.role as 'user' | 'assistant',
        content: row.content,
        timestamp: new Date(row.created_at),
        toolsUsed: row.tools_used || [],
        selfReflection: row.self_reflection || undefined
      }));

      setConversations(messages);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Failed to load conversation history');
    } finally {
      setIsLoading(false);
    }
  };

  // Load available sessions
  const loadSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('agent_conversations')
        .select('session_id, created_at, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by session and create session summaries
      const sessionMap = new Map<string, ConversationSession>();
      
      (data || []).forEach(row => {
        const sessionId = row.session_id;
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            id: sessionId,
            title: row.content.slice(0, 50) + (row.content.length > 50 ? '...' : ''),
            lastMessage: new Date(row.created_at),
            messageCount: 1
          });
        } else {
          const session = sessionMap.get(sessionId)!;
          session.messageCount++;
          if (new Date(row.created_at) > session.lastMessage) {
            session.lastMessage = new Date(row.created_at);
          }
        }
      });

      setSessions(Array.from(sessionMap.values()));
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load conversation sessions');
    }
  };

  // Add message to current conversation
  const addMessage = (message: ConversationMessage) => {
    setConversations(prev => [...prev, message]);
  };

  // Get conversation history for API calls
  const getConversationHistory = () => {
    return conversations.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  };

  // Delete a session
  const deleteSession = async (sessionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('agent_conversations')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        startNewSession();
      }

      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete conversation');
    }
  };

  // Load sessions when user changes
  useEffect(() => {
    if (user) {
      loadSessions();
      if (!currentSessionId) {
        startNewSession();
      }
    }
  }, [user]);

  return {
    currentSessionId,
    conversations,
    sessions,
    isLoading,
    startNewSession,
    loadSession,
    loadSessions,
    addMessage,
    getConversationHistory,
    deleteSession
  };
}
