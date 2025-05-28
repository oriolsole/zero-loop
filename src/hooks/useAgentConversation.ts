import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMessageDeduplication } from './useMessageDeduplication';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  messageType?: 'analysis' | 'planning' | 'execution' | 'tool-update' | 'response' | 'step-executing' | 'step-completed' | 'loop-start' | 'loop-reflection' | 'loop-enhancement' | 'loop-complete' | 'tool-executing';
  isStreaming?: boolean;
  toolsUsed?: Array<{
    name: string;
    success: boolean;
    result?: any;
    error?: string;
  }>;
  selfReflection?: string;
  toolDecision?: {
    reasoning: string;
    selectedTools: string[];
  };
  executionPlan?: any;
  aiReasoning?: string;
  followUpSuggestions?: string[];
  loopIteration?: number;
  improvementReasoning?: string;
  shouldContinueLoop?: boolean;
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
  
  // Use deduplication hook
  const {
    shouldProcessMessage,
    isRequestInProgress,
    markRequestInProgress,
    markRequestCompleted,
    cleanupProcessedMessages
  } = useMessageDeduplication();
  
  // Track last sync time to prevent excessive polling
  const lastSyncTime = useRef<number>(0);
  const syncInProgress = useRef<boolean>(false);

  const generateSessionTitle = (firstMessage: string): string => {
    const truncated = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...' 
      : firstMessage;
    return truncated;
  };

  // Helper function to safely convert tools_used from database
  const convertToolsUsed = useCallback((toolsUsed: any): Array<{name: string; success: boolean; result?: any; error?: string;}> => {
    if (!toolsUsed) return [];
    
    if (typeof toolsUsed === 'string') {
      try {
        toolsUsed = JSON.parse(toolsUsed);
      } catch {
        return [];
      }
    }
    
    if (!Array.isArray(toolsUsed)) return [];
    
    return toolsUsed.map((tool: any) => {
      if (typeof tool === 'object' && tool !== null) {
        return {
          name: tool.name || 'Unknown Tool',
          success: Boolean(tool.success),
          result: tool.result,
          error: tool.error
        };
      }
      return {
        name: 'Unknown Tool',
        success: false,
        error: 'Invalid tool data'
      };
    });
  }, []);

  const loadExistingSessions = useCallback(async () => {
    if (!user || isLoadingSessions) return;

    setIsLoadingSessions(true);
    
    try {
      const { data: sessionData, error } = await supabase
        .from('agent_conversations')
        .select('session_id, created_at, content, role')
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

    // Check for duplicates using the deduplication hook
    if (!shouldProcessMessage(message)) {
      console.log(`Duplicate message filtered: ${message.id}`);
      return;
    }

    // Update local state immediately for better UX
    setConversations(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        return prev;
      }
      return [...prev, message];
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

    // Save to database with better error handling
    try {
      const { error } = await supabase
        .from('agent_conversations')
        .insert({
          session_id: currentSessionId,
          user_id: user.id,
          role: message.role,
          content: message.content,
          message_type: message.messageType || null,
          tools_used: message.toolsUsed || null,
          self_reflection: message.selfReflection || null,
          tool_decision: message.toolDecision || null,
          ai_reasoning: message.aiReasoning || null,
          loop_iteration: message.loopIteration || 0,
          improvement_reasoning: message.improvementReasoning || null,
          should_continue_loop: message.shouldContinueLoop || null,
          created_at: message.timestamp.toISOString()
        });

      if (error) {
        console.error('Error saving message:', error);
        // Don't remove from local state if it's a duplicate constraint error
        if (!error.message.includes('unique constraint') && !error.message.includes('duplicate')) {
          // Remove from local state if it's not a duplicate error
          setConversations(prev => prev.filter(m => m.id !== message.id));
        }
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }

    // Cleanup old processed messages periodically
    cleanupProcessedMessages();
  }, [currentSessionId, user, conversations.length, shouldProcessMessage, cleanupProcessedMessages]);

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

      const messages: ConversationMessage[] = data
        .map(row => ({
          id: row.id.toString(),
          role: row.role as ConversationMessage['role'],
          content: row.content,
          timestamp: new Date(row.created_at),
          messageType: row.message_type as ConversationMessage['messageType'] || undefined,
          toolsUsed: convertToolsUsed(row.tools_used),
          selfReflection: row.self_reflection || undefined,
          toolDecision: row.tool_decision && typeof row.tool_decision === 'object' ? 
            row.tool_decision as { reasoning: string; selectedTools: string[]; } : undefined,
          aiReasoning: row.ai_reasoning || undefined,
          loopIteration: row.loop_iteration || 0,
          improvementReasoning: row.improvement_reasoning || undefined,
          shouldContinueLoop: row.should_continue_loop || undefined
        }))
        .filter(message => shouldProcessMessage(message)); // Filter duplicates

      setConversations(messages);
      console.log(`Loaded ${messages.length} messages for session ${sessionId}`);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }, [user, convertToolsUsed, shouldProcessMessage]);

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

  // Optimized refresh with throttling
  const refreshConversationState = useCallback(async () => {
    if (!currentSessionId || !user || syncInProgress.current) return;

    const now = Date.now();
    if (now - lastSyncTime.current < 5000) { // Throttle to max once per 5 seconds
      return;
    }

    syncInProgress.current = true;
    lastSyncTime.current = now;

    try {
      const lastMessage = conversations.length > 0 ? conversations[conversations.length - 1] : null;
      const sinceTime = lastMessage ? lastMessage.timestamp.toISOString() : new Date(Date.now() - 60000).toISOString();

      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('session_id', currentSessionId)
        .eq('user_id', user.id)
        .gt('created_at', sinceTime)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        const newMessages = data
          .map(row => ({
            id: row.id.toString(),
            role: row.role as ConversationMessage['role'],
            content: row.content,
            timestamp: new Date(row.created_at),
            messageType: row.message_type as ConversationMessage['messageType'] || undefined,
            toolsUsed: convertToolsUsed(row.tools_used),
            loopIteration: row.loop_iteration || 0,
            improvementReasoning: row.improvement_reasoning || undefined,
            shouldContinueLoop: row.should_continue_loop || undefined
          }))
          .filter(message => shouldProcessMessage(message));

        if (newMessages.length > 0) {
          setConversations(prev => [...prev, ...newMessages]);
        }
      }
    } catch (error) {
      console.warn('Error refreshing conversation:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [currentSessionId, user, conversations, convertToolsUsed, shouldProcessMessage]);

  // Reset processed messages when session changes
  useEffect(() => {
    processedMessageIds.current.clear();
  }, [currentSessionId]);

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
    refreshConversationState
  };
};
