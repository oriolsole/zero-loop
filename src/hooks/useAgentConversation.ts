
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
      
      // Load from the new sessions table
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

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
      
      // Insert the session into the database
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          id: newSessionId,
          title: sessionTitle,
          user_id: user.id,
          message_count: 0
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        toast.error('Failed to create new chat session');
        return;
      }

      console.log('Created new session:', sessionData);
      
      // Update local state
      setCurrentSessionId(newSessionId);
      setConversations([]);
      
      // Add to sessions list
      const newSession: Session = {
        id: sessionData.id,
        title: sessionData.title,
        created_at: sessionData.created_at,
        updated_at: sessionData.updated_at,
        messageCount: sessionData.message_count
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

      // Update session message count
      await updateSessionMessageCount(currentSessionId);
      
    } catch (error) {
      console.error('Error saving message:', error);
      // Revert optimistic update
      setConversations(prev => prev.filter(msg => msg.id !== message.id));
      toast.error('Failed to save message');
    }
  };

  const updateSessionMessageCount = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          message_count: conversations.length + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating session message count:', error);
      }
    } catch (error) {
      console.error('Error updating session message count:', error);
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
      // Delete from sessions table (this will cascade to conversations due to foreign key)
      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (sessionError) {
        console.error('Error deleting session:', sessionError);
        toast.error('Failed to delete session');
        return;
      }

      // Delete conversations manually (since we don't have foreign key cascade set up)
      const { error: conversationError } = await supabase
        .from('agent_conversations')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      if (conversationError) {
        console.error('Error deleting conversations:', conversationError);
        // Continue anyway, session is deleted
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
