
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

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      // Create mock sessions from agent_conversations grouped by session_id
      const { data, error } = await supabase
        .from('agent_conversations')
        .select('session_id, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading sessions:', error);
      } else {
        // Group conversations by session_id and create session objects
        const sessionMap = new Map();
        data?.forEach(conversation => {
          if (!sessionMap.has(conversation.session_id)) {
            sessionMap.set(conversation.session_id, {
              id: conversation.session_id,
              title: `Chat Session`,
              created_at: conversation.created_at,
              updated_at: conversation.created_at,
              messageCount: 1
            });
          } else {
            const session = sessionMap.get(conversation.session_id);
            session.messageCount += 1;
            session.updated_at = conversation.created_at;
          }
        });

        setSessions(Array.from(sessionMap.values()));
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
        .from('agent_conversations')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading conversation history:', error);
      } else {
        setConversations(data.map(msg => ({
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
        })));
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const startNewSession = async () => {
    if (!user) return;

    // Generate a new session ID
    const newSessionId = `session-${Date.now()}`;
    setCurrentSessionId(newSessionId);
    setConversations([]);
    
    // Add to sessions list
    const newSession: Session = {
      id: newSessionId,
      title: `Chat Session ${sessions.length + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messageCount: 0
    };
    
    setSessions(prevSessions => [newSession, ...prevSessions]);
  };

  const loadSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const addMessage = async (message: ConversationMessage) => {
    if (!user || !currentSessionId) return;

    setConversations(prev => [...prev, message]);

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
      .from('agent_conversations')
      .delete()
      .eq('session_id', sessionId)
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
