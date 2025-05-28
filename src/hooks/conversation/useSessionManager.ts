
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationContext } from '@/contexts/ConversationContext';
import { ConversationSession } from '@/hooks/useAgentConversation';
import { supabase } from '@/integrations/supabase/client';

export const useSessionManager = () => {
  const { user } = useAuth();
  const {
    currentSessionId,
    setCurrentSessionId,
    setCurrentSession,
    sessions,
    setSessions,
    setMessages,
    isLoadingSessions,
    setIsLoadingSessions
  } = useConversationContext();

  const generateSessionTitle = (firstMessage: string): string => {
    const truncated = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...' 
      : firstMessage;
    return truncated;
  };

  const loadExistingSessions = useCallback(async () => {
    if (!user || isLoadingSessions) return;

    setIsLoadingSessions(true);
    
    try {
      console.log('🔍 Loading existing sessions for user:', user.id);
      
      const { data: sessionData, error } = await supabase
        .from('agent_conversations')
        .select('session_id, created_at, content, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading session data:', error);
        throw error;
      }

      console.log(`📊 Raw session data: ${sessionData?.length || 0} messages`);

      if (sessionData && sessionData.length > 0) {
        const sessionGroups = new Map<string, any[]>();
        
        sessionData.forEach((row) => {
          const sessionId = row.session_id;
          if (!sessionGroups.has(sessionId)) {
            sessionGroups.set(sessionId, []);
          }
          sessionGroups.get(sessionId)!.push(row);
        });

        console.log(`📁 Found ${sessionGroups.size} unique sessions`);

        const sessionsArray: ConversationSession[] = [];
        
        sessionGroups.forEach((messages, sessionId) => {
          messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          const firstMessage = messages[0];
          const lastMessage = messages[messages.length - 1];
          const titleMessage = messages.find(msg => msg.role === 'user') || firstMessage;
          
          const session: ConversationSession = {
            id: sessionId,
            title: generateSessionTitle(titleMessage.content),
            created_at: new Date(firstMessage.created_at),
            updated_at: new Date(lastMessage.created_at),
            lastMessage: lastMessage.content,
            messageCount: messages.length
          };
          
          sessionsArray.push(session);
        });

        sessionsArray.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
        setSessions(sessionsArray);
        console.log(`✅ Successfully loaded ${sessionsArray.length} sessions`);
      } else {
        console.log('📭 No session data found');
        setSessions([]);
      }
    } catch (error) {
      console.error('❌ Error loading existing sessions:', error);
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [user, isLoadingSessions, setSessions, setIsLoadingSessions]);

  const startNewSession = useCallback(async () => {
    if (!user) return;

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(sessionId);
    setMessages([]);
    
    const newSession: ConversationSession = {
      id: sessionId,
      title: 'New Conversation',
      created_at: new Date(),
      updated_at: new Date(),
      messageCount: 0
    };
    
    setCurrentSession(newSession);
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    console.log(`🆕 Started new session: ${sessionId}`);
    
    return sessionId;
  }, [user, setCurrentSessionId, setCurrentSession, setSessions, setMessages, sessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('agent_conversations')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      const filteredSessions = sessions.filter(session => session.id !== sessionId);
      setSessions(filteredSessions);
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }, [user, currentSessionId, setSessions, setCurrentSessionId, setCurrentSession, setMessages, sessions]);

  return {
    currentSessionId,
    sessions,
    isLoadingSessions,
    loadExistingSessions,
    startNewSession,
    deleteSession
  };
};
