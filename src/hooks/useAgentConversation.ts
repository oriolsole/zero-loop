
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  messageType?: 'response' | 'step-executing' | 'step-completed' | 'tool-update' | 'step-announcement' | 'partial-result' | 'tool-announcement';
  toolsUsed?: any[];
  aiReasoning?: string;
  toolDecision?: {
    reasoning: string;
    selectedTools?: string[];
  };
  selfReflection?: string;
  followUpSuggestions?: string[];
  toolName?: string;
  toolAction?: string;
}

export interface ConversationSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const useAgentConversation = () => {
  const { user } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Generate a new session ID
  const generateSessionId = () => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    return `session-${timestamp}-${randomSuffix}`;
  };

  // Start a new session
  const startNewSession = async () => {
    if (!user) return;

    const newSessionId = generateSessionId();
    setCurrentSessionId(newSessionId);
    setConversations([]);

    try {
      const { error } = await supabase
        .from('agent_sessions')
        .insert({
          id: newSessionId,
          user_id: user.id,
          title: 'New Conversation',
          messages: []
        });

      if (error) {
        console.error('Error creating session:', error);
        return;
      }

      await loadSessions();
    } catch (error) {
      console.error('Error starting new session:', error);
    }
  };

  // Load existing sessions
  const loadSessions = async () => {
    if (!user) return;

    setIsLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('agent_sessions')
        .select('id, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading sessions:', error);
        return;
      }

      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Load a specific session
  const loadSession = async (sessionId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('agent_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading session:', error);
        return;
      }

      setCurrentSessionId(sessionId);
      
      const messages = data.messages || [];
      const parsedMessages: ConversationMessage[] = messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      setConversations(parsedMessages);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  // Delete a session
  const deleteSession = async (sessionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('agent_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting session:', error);
        return;
      }

      // If we're deleting the current session, start a new one
      if (sessionId === currentSessionId) {
        await startNewSession();
      }

      await loadSessions();
      toast.success('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  // Add a message to the current conversation
  const addMessage = async (message: ConversationMessage) => {
    if (!currentSessionId || !user) return;

    const newConversations = [...conversations, message];
    setConversations(newConversations);

    try {
      // Update the session with the new message
      const { error } = await supabase
        .from('agent_sessions')
        .update({ 
          messages: newConversations.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString()
          })),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating session:', error);
      }

      // Update session title if this is the first user message
      if (message.role === 'user' && newConversations.filter(m => m.role === 'user').length === 1) {
        const title = message.content.length > 50 
          ? message.content.substring(0, 47) + '...'
          : message.content;
        
        await supabase
          .from('agent_sessions')
          .update({ title })
          .eq('id', currentSessionId)
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Update an existing message
  const updateMessage = async (messageId: string, updates: Partial<ConversationMessage>) => {
    const updatedConversations = conversations.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    );
    setConversations(updatedConversations);

    if (currentSessionId && user) {
      try {
        await supabase
          .from('agent_sessions')
          .update({ 
            messages: updatedConversations.map(msg => ({
              ...msg,
              timestamp: msg.timestamp.toISOString()
            })),
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSessionId)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error updating message:', error);
      }
    }
  };

  // Get conversation history for API calls
  const getConversationHistory = () => {
    return conversations
      .filter(msg => msg.messageType !== 'step-announcement' && 
                    msg.messageType !== 'partial-result' && 
                    msg.messageType !== 'tool-announcement')
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  };

  // Initialize session on user change
  useEffect(() => {
    if (user && !currentSessionId) {
      startNewSession();
      loadSessions();
    }
  }, [user]);

  return {
    currentSessionId,
    conversations,
    sessions,
    isLoadingSessions,
    startNewSession,
    loadSession,
    loadSessions,
    deleteSession,
    addMessage,
    updateMessage,
    getConversationHistory
  };
};
