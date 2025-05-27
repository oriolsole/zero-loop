
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
      // Use raw SQL query to insert into agent_sessions since it's not in the generated types yet
      const { error } = await supabase.rpc('exec_sql', {
        query: `
          INSERT INTO agent_sessions (id, user_id, title, messages)
          VALUES ($1, $2, $3, $4)
        `,
        params: [newSessionId, user.id, 'New Conversation', JSON.stringify([])]
      });

      if (error) {
        console.error('Error creating session:', error);
        // Fallback: just set the session locally
        console.log('Using local session management as fallback');
      }

      await loadSessions();
    } catch (error) {
      console.error('Error starting new session:', error);
      // Continue with local session management
    }
  };

  // Load existing sessions
  const loadSessions = async () => {
    if (!user) return;

    setIsLoadingSessions(true);
    try {
      // Use raw SQL query since agent_sessions is not in the generated types yet
      const { data, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT id, title, created_at, updated_at,
                 jsonb_array_length(messages) as message_count
          FROM agent_sessions 
          WHERE user_id = $1 
          ORDER BY updated_at DESC
        `,
        params: [user.id]
      });

      if (error) {
        console.error('Error loading sessions:', error);
        setSessions([]);
        return;
      }

      // Transform the data to match our interface
      const transformedSessions = (data || []).map((session: any) => ({
        id: session.id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        messageCount: session.message_count || 0
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
      // Use raw SQL query since agent_sessions is not in the generated types yet
      const { data, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT * FROM agent_sessions 
          WHERE id = $1 AND user_id = $2
        `,
        params: [sessionId, user.id]
      });

      if (error || !data || data.length === 0) {
        console.error('Error loading session:', error);
        return;
      }

      const sessionData = data[0];
      setCurrentSessionId(sessionId);
      
      const messages = sessionData.messages || [];
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
      // Use raw SQL query since agent_sessions is not in the generated types yet
      const { error } = await supabase.rpc('exec_sql', {
        query: `
          DELETE FROM agent_sessions 
          WHERE id = $1 AND user_id = $2
        `,
        params: [sessionId, user.id]
      });

      if (error) {
        console.error('Error deleting session:', error);
        toast.error('Failed to delete session');
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
      // Update the session with the new message using raw SQL
      const { error } = await supabase.rpc('exec_sql', {
        query: `
          UPDATE agent_sessions 
          SET messages = $1, updated_at = now()
          WHERE id = $2 AND user_id = $3
        `,
        params: [
          JSON.stringify(newConversations.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString()
          }))),
          currentSessionId,
          user.id
        ]
      });

      if (error) {
        console.error('Error updating session:', error);
      }

      // Update session title if this is the first user message
      if (message.role === 'user' && newConversations.filter(m => m.role === 'user').length === 1) {
        const title = message.content.length > 50 
          ? message.content.substring(0, 47) + '...'
          : message.content;
        
        await supabase.rpc('exec_sql', {
          query: `
            UPDATE agent_sessions 
            SET title = $1
            WHERE id = $2 AND user_id = $3
          `,
          params: [title, currentSessionId, user.id]
        });
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
        await supabase.rpc('exec_sql', {
          query: `
            UPDATE agent_sessions 
            SET messages = $1, updated_at = now()
            WHERE id = $2 AND user_id = $3
          `,
          params: [
            JSON.stringify(updatedConversations.map(msg => ({
              ...msg,
              timestamp: msg.timestamp.toISOString()
            }))),
            currentSessionId,
            user.id
          ]
        });
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
