
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  isAutonomous?: boolean;
  messageType?: 'thinking' | 'tool-usage' | 'tool-result' | 'reflection' | 'autonomous' | 'standard';
  toolName?: string;
  stepNumber?: number;
}

export interface ConversationSession {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  lastMessage?: string;
  messageCount?: number;
}

export const useAgentConversation = () => {
  const { user } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const realtimeChannelRef = useRef<any>(null);
  const pendingMessages = useRef<Set<string>>(new Set());

  const generateSessionTitle = (firstMessage: string): string => {
    const truncated = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...' 
      : firstMessage;
    return truncated;
  };

  // Add atomic step message with deduplication
  const addAtomicStep = useCallback(async (
    messageType: 'thinking' | 'tool-usage' | 'tool-result' | 'reflection',
    content: string,
    toolName?: string,
    stepNumber?: number
  ) => {
    if (!currentSessionId || !user) return;

    const atomicMessage: ConversationMessage = {
      id: `${messageType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      messageType,
      toolName,
      stepNumber
    };

    console.log('🔧 Adding atomic step locally:', { 
      messageType, 
      stepNumber,
      content: content.substring(0, 50) + '...',
      id: atomicMessage.id
    });

    setConversations(prev => {
      // Check for duplicates based on content and type
      const exists = prev.some(msg => 
        msg.messageType === messageType && 
        msg.content === content && 
        msg.stepNumber === stepNumber
      );
      
      if (exists) {
        console.log('🔧 Atomic step already exists, skipping duplicate');
        return prev;
      }
      
      const newConversations = [...prev, atomicMessage];
      console.log('🔧 Updated conversations count:', newConversations.length);
      return newConversations;
    });

    // Store in database for persistence
    try {
      await supabase
        .from('agent_conversations')
        .insert({
          session_id: currentSessionId,
          user_id: user.id,
          role: 'assistant',
          content,
          message_type: messageType,
          tool_name: toolName,
          step_number: stepNumber,
          created_at: atomicMessage.timestamp.toISOString()
        });
      console.log('✅ Atomic step saved to database');
    } catch (error) {
      console.error('❌ Error saving atomic step:', error);
    }
  }, [currentSessionId, user]);

  // Update existing message (for streaming updates)
  const updateAtomicStep = useCallback((messageId: string, content: string) => {
    console.log('🔧 Updating atomic step:', messageId, content.substring(0, 50) + '...');
    setConversations(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, content } : msg
    ));
  }, []);

  const loadExistingSessions = useCallback(async () => {
    if (!user || isLoadingSessions) return;

    setIsLoadingSessions(true);
    
    try {
      const { data: sessionData, error } = await supabase
        .from('agent_conversations')
        .select('session_id, created_at, content, role, message_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (sessionData && sessionData.length > 0) {
        const sessionMap = new Map<string, {
          id: string;
          firstMessage: string;
          lastMessage: string;
          messageCount: number;
          created_at: Date;
          updated_at: Date;
        }>();

        sessionData.forEach((row) => {
          const sessionId = row.session_id;
          const createdAt = new Date(row.created_at);
          
          if (!sessionMap.has(sessionId)) {
            sessionMap.set(sessionId, {
              id: sessionId,
              firstMessage: row.role === 'user' ? row.content : '',
              lastMessage: row.content,
              messageCount: 0,
              created_at: createdAt,
              updated_at: createdAt
            });
          }
          
          const session = sessionMap.get(sessionId)!;
          session.messageCount++;
          session.updated_at = createdAt > session.updated_at ? createdAt : session.updated_at;
          session.lastMessage = row.content;
          
          if (row.role === 'user' && !session.firstMessage) {
            session.firstMessage = row.content;
          }
        });

        const sessionsArray: ConversationSession[] = Array.from(sessionMap.values())
          .map(session => ({
            id: session.id,
            title: generateSessionTitle(session.firstMessage || session.lastMessage),
            created_at: session.created_at,
            updated_at: session.updated_at,
            lastMessage: session.lastMessage,
            messageCount: session.messageCount
          }))
          .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

        setSessions(sessionsArray);
        console.log(`📦 Loaded ${sessionsArray.length} existing sessions`);
      }
    } catch (error) {
      console.error('Error loading existing sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [user, isLoadingSessions]);

  const startNewSession = useCallback(async () => {
    if (!user) return;

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(sessionId);
    setConversations([]);
    pendingMessages.current.clear();
    
    const newSession: ConversationSession = {
      id: sessionId,
      title: 'New Conversation',
      created_at: new Date(),
      updated_at: new Date(),
      messageCount: 0
    };
    
    setSessions(prev => [newSession, ...prev]);
    console.log('🆕 Started new session:', sessionId);
  }, [user]);

  const addMessage = useCallback(async (message: ConversationMessage) => {
    if (!currentSessionId || !user) return;

    console.log('💬 Adding message:', { 
      role: message.role, 
      messageType: message.messageType, 
      content: message.content.substring(0, 50) + '...',
      id: message.id
    });

    setConversations(prev => {
      // Check for duplicates
      const exists = prev.some(msg => msg.id === message.id);
      if (exists) {
        console.log('💬 Message already exists, skipping duplicate');
        return prev;
      }
      
      const newConversations = [...prev, message];
      console.log('💬 Updated conversations count:', newConversations.length);
      return newConversations;
    });

    // Update session metadata
    if (message.role === 'user' && conversations.length === 0) {
      const title = generateSessionTitle(message.content);
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { 
              ...session, 
              title, 
              updated_at: new Date(),
              messageCount: (session.messageCount || 0) + 1
            }
          : session
      ));
    } else {
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { 
              ...session, 
              updated_at: new Date(),
              messageCount: (session.messageCount || 0) + 1,
              lastMessage: message.content
            }
          : session
      ));
    }

    // Only store user messages here - assistant messages are handled by the backend or atomic steps
    if (message.role === 'user') {
      try {
        await supabase
          .from('agent_conversations')
          .insert({
            session_id: currentSessionId,
            user_id: user.id,
            role: message.role,
            content: message.content,
            created_at: message.timestamp.toISOString()
          });
      } catch (error) {
        console.error('Error saving message:', error);
      }
    }
  }, [currentSessionId, user, conversations.length]);

  const updateMessage = useCallback((messageId: string, updates: Partial<ConversationMessage>) => {
    setConversations(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    console.log('📂 Loading session:', sessionId);
    setCurrentSessionId(sessionId);
    setConversations([]); // Clear existing conversations
    pendingMessages.current.clear();
    
    try {
      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messages: ConversationMessage[] = data.map(row => ({
        id: row.id.toString(),
        role: row.role as ConversationMessage['role'],
        content: row.content,
        timestamp: new Date(row.created_at),
        isAutonomous: row.message_type === 'reflection' || row.message_type === 'autonomous',
        messageType: row.message_type as ConversationMessage['messageType'] || 'standard',
        toolName: row.tool_name || undefined,
        stepNumber: row.step_number || undefined
      }));

      setConversations(messages);
      
      console.log(`📂 Loaded ${messages.length} messages for session ${sessionId}`, {
        messageTypes: messages.map(m => ({ type: m.messageType, step: m.stepNumber })).filter(m => m.type),
        roles: messages.map(m => m.role),
        atomicSteps: messages.filter(m => m.messageType && m.messageType !== 'standard').length
      });
    } catch (error) {
      console.error('❌ Error loading session:', error);
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
    // Only include user messages and final assistant responses for conversation history
    // Exclude atomic steps (thinking, tool-usage, etc.) from history sent to backend
    return conversations
      .filter(msg => 
        (msg.role === 'user') || 
        (msg.role === 'assistant' && (!msg.messageType || msg.messageType === 'standard'))
      )
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  }, [conversations]);

  // Enhanced real-time listener with better handling
  const startListeningForAutonomousMessages = useCallback(() => {
    if (!currentSessionId || !user) return;

    console.log('🔄 Starting enhanced real-time listener for session:', currentSessionId);

    // Clean up existing channel
    if (realtimeChannelRef.current) {
      console.log('🔄 Cleaning up existing channel');
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel(`session-${currentSessionId}-enhanced`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_conversations',
          filter: `session_id=eq.${currentSessionId}`
        },
        (payload) => {
          const newRow = payload.new as any;
          
          console.log('🔄 Real-time message received:', {
            id: newRow.id,
            role: newRow.role,
            messageType: newRow.message_type,
            stepNumber: newRow.step_number,
            content: newRow.content.substring(0, 100) + '...',
            toolName: newRow.tool_name,
            timestamp: newRow.created_at
          });
          
          // Check if this message is already pending or exists
          const messageId = newRow.id.toString();
          if (pendingMessages.current.has(messageId)) {
            console.log('🔄 Message already pending, skipping:', messageId);
            return;
          }
          
          pendingMessages.current.add(messageId);
          
          if (newRow.role === 'assistant') {
            const autonomousMessage: ConversationMessage = {
              id: messageId,
              role: 'assistant',
              content: newRow.content,
              timestamp: new Date(newRow.created_at),
              isAutonomous: newRow.message_type === 'reflection' || newRow.message_type === 'autonomous',
              messageType: newRow.message_type as ConversationMessage['messageType'] || 'standard',
              toolName: newRow.tool_name || undefined,
              stepNumber: newRow.step_number || undefined
            };

            setConversations(prev => {
              const exists = prev.some(msg => msg.id === autonomousMessage.id);
              if (exists) {
                console.log('🔄 Message already exists in state, skipping:', autonomousMessage.id);
                pendingMessages.current.delete(messageId);
                return prev;
              }
              
              console.log('🔄 Adding new real-time message to state:', {
                id: autonomousMessage.id,
                messageType: autonomousMessage.messageType,
                stepNumber: autonomousMessage.stepNumber,
                content: autonomousMessage.content.substring(0, 50) + '...'
              });
              
              // Remove from pending after adding
              setTimeout(() => pendingMessages.current.delete(messageId), 1000);
              
              return [...prev, autonomousMessage];
            });

            setSessions(prev => prev.map(session => 
              session.id === currentSessionId 
                ? { 
                    ...session, 
                    updated_at: new Date(),
                    messageCount: (session.messageCount || 0) + 1,
                    lastMessage: newRow.content
                  }
                : session
            ));
          }
        }
      )
      .subscribe((status) => {
        console.log('🔄 Enhanced real-time subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('🔄 Cleaning up enhanced real-time subscription');
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      pendingMessages.current.clear();
    };
  }, [currentSessionId, user]);

  useEffect(() => {
    if (user && sessions.length === 0 && !isLoadingSessions) {
      loadExistingSessions();
    }
  }, [user, sessions.length, loadExistingSessions, isLoadingSessions]);

  useEffect(() => {
    if (user && !currentSessionId && sessions.length === 0 && !isLoadingSessions) {
      startNewSession();
    }
  }, [user, currentSessionId, sessions.length, startNewSession, isLoadingSessions]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    if (currentSessionId && user) {
      cleanup = startListeningForAutonomousMessages();
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [currentSessionId, user, startListeningForAutonomousMessages]);

  return {
    currentSessionId,
    conversations,
    sessions,
    isLoadingSessions,
    startNewSession,
    loadSession,
    addMessage,
    updateMessage,
    deleteSession,
    getConversationHistory,
    loadExistingSessions,
    addAtomicStep,
    updateAtomicStep
  };
};
