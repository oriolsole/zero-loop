import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  messageType?: 'analysis' | 'planning' | 'execution' | 'tool-update' | 'response' | 'step-executing' | 'step-completed';
  isStreaming?: boolean;
  toolsUsed?: Array<{
    name: string;
    success: boolean;
    result?: any;
    error?: string;
  }>;
  knowledgeUsed?: Array<{
    name: string;
    success: boolean;
    result?: any;
    sources?: any[];
    searchMode?: 'semantic' | 'text';
  }>;
  learningInsights?: Array<{
    name: string;
    success: boolean;
    result?: any;
    insight?: any;
  }>;
  toolProgress?: Array<{
    name: string;
    status: 'pending' | 'executing' | 'completed' | 'failed';
    displayName?: string;
  }>;
  selfReflection?: string;
  toolDecision?: {
    reasoning: string;
    selectedTools: string[];
  };
  executionPlan?: any;
  aiReasoning?: string;
  stepDetails?: {
    tool: string;
    result: any;
    status: string;
    progressUpdate?: string;
  };
  followUpSuggestions?: string[];
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
      // Get distinct sessions with metadata
      const { data: sessionData, error } = await supabase
        .from('agent_conversations')
        .select('session_id, created_at, content, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading sessions:', error);
        return;
      }

      if (sessionData && sessionData.length > 0) {
        // Group messages by session_id and create session metadata
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
          
          // Set first user message as the session title source
          if (row.role === 'user' && !session.firstMessage) {
            session.firstMessage = row.content;
          }
        });

        // Convert to sessions array
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
        console.log(`Loaded ${sessionsArray.length} existing sessions`);
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
    
    const newSession: ConversationSession = {
      id: sessionId,
      title: 'New Conversation',
      created_at: new Date(),
      updated_at: new Date(),
      messageCount: 0
    };
    
    setSessions(prev => [newSession, ...prev]);
  }, [user]);

  const addMessage = useCallback(async (message: ConversationMessage) => {
    if (!currentSessionId || !user) return;

    setConversations(prev => [...prev, message]);

    // Update session title if this is the first user message
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
      // Update session metadata
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

    try {
      await supabase
        .from('agent_conversations')
        .insert({
          session_id: currentSessionId,
          user_id: user.id,
          role: message.role,
          content: message.content,
          message_type: message.messageType || null,
          tools_used: message.toolsUsed || null,
          knowledge_used: message.knowledgeUsed || null,
          learning_insights: message.learningInsights || null,
          self_reflection: message.selfReflection || null,
          tool_decision: message.toolDecision || null,
          tool_progress: message.toolProgress || null,
          ai_reasoning: message.aiReasoning || null,
          created_at: message.timestamp.toISOString()
        });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }, [currentSessionId, user, conversations.length]);

  const updateMessage = useCallback((messageId: string, updates: Partial<ConversationMessage>) => {
    setConversations(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    setCurrentSessionId(sessionId);
    
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
        messageType: row.message_type as ConversationMessage['messageType'] || undefined,
        toolsUsed: Array.isArray(row.tools_used) ? row.tools_used as Array<{
          name: string;
          success: boolean;
          result?: any;
          error?: string;
        }> : undefined,
        knowledgeUsed: Array.isArray((row as any).knowledge_used) ? (row as any).knowledge_used as Array<{
          name: string;
          success: boolean;
          result?: any;
          sources?: any[];
          searchMode?: 'semantic' | 'text';
        }> : undefined,
        learningInsights: Array.isArray((row as any).learning_insights) ? (row as any).learning_insights as Array<{
          name: string;
          success: boolean;
          result?: any;
          insight?: any;
        }> : undefined,
        selfReflection: row.self_reflection || undefined,
        toolDecision: row.tool_decision && typeof row.tool_decision === 'object' ? 
          row.tool_decision as { reasoning: string; selectedTools: string[]; } : undefined,
        toolProgress: Array.isArray(row.tool_progress) ? row.tool_progress as Array<{
          name: string;
          status: 'pending' | 'executing' | 'completed' | 'failed';
          displayName?: string;
        }> : undefined,
        aiReasoning: row.ai_reasoning || undefined
      }));

      setConversations(messages);
      console.log(`Loaded ${messages.length} messages for session ${sessionId}`);
    } catch (error) {
      console.error('Error loading session:', error);
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
    return conversations.filter(msg => msg.role === 'user' || msg.role === 'assistant').map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }, [conversations]);

  // Load existing sessions when user becomes available
  useEffect(() => {
    if (user && sessions.length === 0 && !isLoadingSessions) {
      loadExistingSessions();
    }
  }, [user, sessions.length, loadExistingSessions, isLoadingSessions]);

  // Initialize with a new session if none exists and no sessions are loading
  useEffect(() => {
    if (user && !currentSessionId && sessions.length === 0 && !isLoadingSessions) {
      startNewSession();
    }
  }, [user, currentSessionId, sessions.length, startNewSession, isLoadingSessions]);

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
    loadExistingSessions
  };
};
