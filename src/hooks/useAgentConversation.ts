
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
  messageCount?: number;
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
        .select('id, title, created_at, updated_at, messages')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading sessions:', error);
        setSessions([]);
        return;
      }

      // Transform the data and calculate message count
      const transformedSessions: ConversationSession[] = (data || []).map((session: any) => ({
        id: session.id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        messageCount: Array.isArray(session.messages) ? session.messages.length : 0
      }));

      setSessions(transformedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
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

      if (error || !data) {
        console.error('Error loading session:', error);
        return;
      }

      setCurrentSessionId(sessionId);
      
      const messages = data.messages || [];
      // Fix TypeScript error: ensure messages is an array before mapping
      const parsedMessages: ConversationMessage[] = Array.isArray(messages) 
        ? messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        : [];
      
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
        toast.error('Failed to delete session');
        return;
      }

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

  // Add a message to the current conversation with fixed database persistence
  const addMessage = async (message: ConversationMessage) => {
    if (!currentSessionId || !user) {
      console.error('❌ Cannot add message: missing sessionId or user');
      return;
    }

    // Use functional update to ensure we get the latest state
    setConversations(prevConversations => {
      const newConversations = [...prevConversations, message];
      
      // Save to database with the updated conversations state
      saveToDatabase(newConversations, message);
      
      return newConversations;
    });
  };

  // Save conversations to database - extracted to fix persistence bug
  const saveToDatabase = async (updatedConversations: ConversationMessage[], latestMessage: ConversationMessage) => {
    if (!currentSessionId || !user) return;

    try {
      const { error } = await supabase
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

      if (error) {
        console.error('Error updating session:', error);
      }

      // Update session title if this is the first user message
      if (latestMessage.role === 'user' && updatedConversations.filter(m => m.role === 'user').length === 1) {
        const title = latestMessage.content.length > 50 
          ? latestMessage.content.substring(0, 47) + '...'
          : latestMessage.content;
        
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
    setConversations(prevConversations => {
      const updatedConversations = prevConversations.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      
      // Save updated conversations to database
      if (currentSessionId && user) {
        saveToDatabase(updatedConversations, updatedConversations.find(m => m.id === messageId)!);
      }
      
      return updatedConversations;
    });
  };

  // Get conversation history for API calls - optimized
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
