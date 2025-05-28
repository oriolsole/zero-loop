
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
    console.log('🔄 Starting new session:', newSessionId);

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
        console.log('Using local session management as fallback');
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
      console.log('📥 Loaded session with messages:', parsedMessages.length);
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

  // Add a message to the current conversation with extensive debugging
  const addMessage = async (message: ConversationMessage) => {
    if (!currentSessionId || !user) {
      console.error('❌ Cannot add message: missing sessionId or user');
      return;
    }

    console.log('📨 Adding message:', {
      id: message.id,
      role: message.role,
      type: message.messageType,
      content: message.content.substring(0, 50) + '...',
      timestamp: message.timestamp
    });

    // Use functional update to ensure we get the latest state
    setConversations(prevConversations => {
      const newConversations = [...prevConversations, message];
      console.log('💬 Conversations updated:', {
        previousCount: prevConversations.length,
        newCount: newConversations.length,
        latestMessage: {
          id: message.id,
          role: message.role,
          type: message.messageType || 'response'
        }
      });
      
      // Log all message IDs for debugging
      console.log('📋 All message IDs:', newConversations.map(m => ({ id: m.id, role: m.role, type: m.messageType })));
      
      return newConversations;
    });

    try {
      // Get the updated conversations for saving
      const updatedConversations = [...conversations, message];
      
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
      if (message.role === 'user' && updatedConversations.filter(m => m.role === 'user').length === 1) {
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
    console.log('🔄 Updating message:', messageId, updates);
    
    setConversations(prevConversations => {
      const updatedConversations = prevConversations.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      
      console.log('📝 Message updated in conversations');
      return updatedConversations;
    });

    if (currentSessionId && user) {
      try {
        // Use current conversations state for saving
        const updatedConversations = conversations.map(msg => 
          msg.id === messageId ? { ...msg, ...updates } : msg
        );
        
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
    const history = conversations
      .filter(msg => msg.messageType !== 'step-announcement' && 
                    msg.messageType !== 'partial-result' && 
                    msg.messageType !== 'tool-announcement')
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    
    console.log('📖 Getting conversation history:', history.length, 'messages');
    return history;
  };

  // Initialize session on user change
  useEffect(() => {
    if (user && !currentSessionId) {
      console.log('🚀 Initializing session for user:', user.id);
      startNewSession();
      loadSessions();
    }
  }, [user]);

  // Debug log whenever conversations change
  useEffect(() => {
    console.log('🔍 Conversations state changed:', {
      count: conversations.length,
      messages: conversations.map(m => ({ id: m.id, role: m.role, type: m.messageType, content: m.content.substring(0, 30) + '...' }))
    });
  }, [conversations]);

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
