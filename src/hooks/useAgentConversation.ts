import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsUsed?: any[];
  selfReflection?: string;
  toolDecision?: {
    shouldUseTools: boolean;
    detectedType: string;
    reasoning: string;
    confidence: number;
    suggestedTools?: string[];
  };
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
        toolsUsed: Array.isArray(row.tools_used) ? row.tools_used as any[] : undefined,
        selfReflection: row.self_reflection || undefined,
        toolDecision: row.tool_decision ? {
          shouldUseTools: (row.tool_decision as any).should_use_tools,
          detectedType: (row.tool_decision as any).detected_type,
          reasoning: (row.tool_decision as any).reasoning,
          confidence: (row.tool_decision as any).confidence,
          suggestedTools: (row.tool_decision as any).suggested_tools
        } : undefined
      }));

      setConversations(messages);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation history",
        variant: "destructive"
      });
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
      toast({
        title: "Error",
        description: "Failed to load conversation sessions",
        variant: "destructive"
      });
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

      toast({
        title: "Success",
        description: "Conversation deleted"
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
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
