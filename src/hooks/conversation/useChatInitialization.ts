
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationContext } from '@/contexts/ConversationContext';
import { useSessionManager } from '@/hooks/conversation/useSessionManager';

export const useChatInitialization = () => {
  const { user } = useAuth();
  const { currentSessionId, loadConversation, setCurrentSession } = useConversationContext();
  
  const { 
    sessions,
    isLoadingSessions,
    loadExistingSessions,
    startNewSession,
    deleteSession
  } = useSessionManager();

  // Load sessions on mount
  useEffect(() => {
    if (user && sessions.length === 0 && !isLoadingSessions) {
      console.log('🔄 Loading sessions on mount');
      loadExistingSessions();
    }
  }, [user, sessions.length, loadExistingSessions, isLoadingSessions]);

  // Auto-start new session if none exists
  useEffect(() => {
    if (user && !currentSessionId && sessions.length === 0 && !isLoadingSessions) {
      console.log('🆕 Auto-starting new session');
      startNewSession();
    }
  }, [user, currentSessionId, sessions.length, startNewSession, isLoadingSessions]);

  const handleLoadSession = async (sessionId: string) => {
    console.log(`📂 Loading session: ${sessionId}`);
    
    const sessionData = sessions.find(s => s.id === sessionId);
    if (sessionData) {
      setCurrentSession(sessionData);
    }

    await loadConversation(sessionId);
  };

  return {
    sessions,
    isLoadingSessions,
    startNewSession,
    deleteSession,
    handleLoadSession
  };
};
