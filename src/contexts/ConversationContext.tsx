
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ConversationMessage, ConversationSession } from '@/hooks/useAgentConversation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ToolProgressItem } from '@/types/tools';
import { useMessageManager } from '@/hooks/conversation/useMessageManager';

interface ConversationContextType {
  // Messages - centralized state management
  messages: ConversationMessage[];
  addMessageToContext: (message: ConversationMessage) => void;
  updateMessageInContext: (messageId: string, updates: Partial<ConversationMessage>) => void;
  clearMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ConversationMessage[]>>;
  
  // Session management - unified session ID tracking
  currentSessionId: string | null;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  currentSession: ConversationSession | null;
  setCurrentSession: React.Dispatch<React.SetStateAction<ConversationSession | null>>;
  sessions: ConversationSession[];
  setSessions: React.Dispatch<React.SetStateAction<ConversationSession[]>>;
  
  // UI state
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingSessions: boolean;
  setIsLoadingSessions: React.Dispatch<React.SetStateAction<boolean>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  
  // Tools
  tools: ToolProgressItem[];
  setTools: React.Dispatch<React.SetStateAction<ToolProgressItem[]>>;
  toolsActive: boolean;
  setToolsActive: React.Dispatch<React.SetStateAction<boolean>>;

  // Database operations
  persistMessage: (message: ConversationMessage) => Promise<boolean>;
  loadConversation: (sessionId: string) => Promise<void>;
  addAssistantResponse: (response: ConversationMessage) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [input, setInput] = useState('');
  const [tools, setTools] = useState<ToolProgressItem[]>([]);
  const [toolsActive, setToolsActive] = useState(false);
  const { user } = useAuth();
  const { persistMessageToDatabase, loadConversationFromDatabase } = useMessageManager();

  // Track only user messages as local (since they're added before backend response)
  const localUserMessageIds = React.useRef<Set<string>>(new Set());

  // Helper to safely convert messageType
  const safeMessageType = (messageType: any): ConversationMessage['messageType'] => {
    const validTypes = [
      'analysis', 'planning', 'execution', 'tool-update', 'response', 
      'step-executing', 'step-completed', 'loop-start', 'loop-reflection', 
      'loop-enhancement', 'loop-complete', 'tool-executing'
    ];
    return validTypes.includes(messageType) ? messageType : undefined;
  };

  // Helper to safely convert toolsUsed
  const safeToolsUsed = (toolsUsed: any): ConversationMessage['toolsUsed'] => {
    if (!toolsUsed) return undefined;
    
    try {
      if (typeof toolsUsed === 'string') {
        const parsed = JSON.parse(toolsUsed);
        if (Array.isArray(parsed)) {
          return parsed.map((tool: any) => ({
            name: tool.name || 'Unknown Tool',
            success: Boolean(tool.success),
            result: tool.result,
            error: tool.error
          }));
        }
      }
      
      if (Array.isArray(toolsUsed)) {
        return toolsUsed.map((tool: any) => ({
          name: tool.name || 'Unknown Tool',
          success: Boolean(tool.success),
          result: tool.result,
          error: tool.error
        }));
      }
    } catch (e) {
      console.warn('Failed to parse toolsUsed:', e);
    }
    
    return undefined;
  };

  // Add message to local context only
  const addMessageToContext = useCallback((message: ConversationMessage) => {
    console.log(`🔵 [CONTEXT] Adding message to context: ${message.id} (${message.role}) - "${message.content.substring(0, 50)}..."`);
    
    setMessages(prev => {
      const exists = prev.find(m => m.id === message.id);
      if (exists) {
        console.log(`⚠️ [CONTEXT] Message ${message.id} already exists in context`);
        return prev;
      }
      
      // Track user messages as local
      if (message.role === 'user') {
        localUserMessageIds.current.add(message.id);
        console.log(`📝 [CONTEXT] Tracked user message as local: ${message.id}`);
      }
      
      const newMessages = [...prev, message].sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      console.log(`✅ [CONTEXT] Message added to context. Total messages: ${newMessages.length}`);
      console.log(`📊 [CONTEXT] Current message IDs in context:`, newMessages.map(m => `${m.id.substring(0, 8)}(${m.role})`));
      return newMessages;
    });
  }, []);

  // Update message in local context only
  const updateMessageInContext = useCallback((messageId: string, updates: Partial<ConversationMessage>) => {
    console.log(`🔄 [CONTEXT] Updating message in context: ${messageId}`);
    setMessages(prev => {
      const messageIndex = prev.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        console.log(`⚠️ [CONTEXT] Message ${messageId} not found for update`);
        return prev;
      }
      
      const updated = [...prev];
      updated[messageIndex] = { ...updated[messageIndex], ...updates };
      console.log(`✅ [CONTEXT] Updated message in context: ${messageId}`);
      return updated;
    });
  }, []);

  // Clear all messages from context
  const clearMessages = useCallback(() => {
    console.log('🧹 [CONTEXT] Clearing all messages from context');
    setMessages([]);
    localUserMessageIds.current.clear();
  }, []);

  // Add assistant response directly to context (for backend responses)
  const addAssistantResponse = useCallback((response: ConversationMessage) => {
    console.log(`🤖 [CONTEXT] Adding assistant response to context: ${response.id} - "${response.content.substring(0, 50)}..."`);
    console.log(`🔍 [CONTEXT] Assistant response details:`, {
      id: response.id,
      role: response.role,
      timestamp: response.timestamp,
      contentLength: response.content.length
    });
    
    // Use the regular addMessageToContext to ensure consistent logging and processing
    addMessageToContext(response);
    
    console.log(`✅ [CONTEXT] Assistant response added successfully`);
  }, [addMessageToContext]);

  // Persist message to database only
  const persistMessage = useCallback(async (message: ConversationMessage): Promise<boolean> => {
    if (!currentSessionId) {
      console.error('❌ [CONTEXT] No session available for persistence');
      return false;
    }

    console.log(`💾 [CONTEXT] Persisting message: ${message.id} to session ${currentSessionId}`);
    const result = await persistMessageToDatabase(message, currentSessionId);
    console.log(`${result ? '✅' : '❌'} [CONTEXT] Message persistence ${result ? 'succeeded' : 'failed'}: ${message.id}`);
    return result;
  }, [currentSessionId, persistMessageToDatabase]);

  // Load conversation from database and update context
  const loadConversation = useCallback(async (sessionId: string) => {
    console.log(`📂 [CONTEXT] Loading conversation: ${sessionId}`);
    clearMessages();
    
    const loadedMessages = await loadConversationFromDatabase(sessionId);
    console.log(`📥 [CONTEXT] Loaded ${loadedMessages.length} messages from database for session ${sessionId}`);
    
    // Add all loaded messages to context
    setMessages(loadedMessages);
    
    // Mark all loaded messages as processed
    loadedMessages.forEach(msg => {
      if (msg.role === 'user') {
        localUserMessageIds.current.add(msg.id);
      }
    });
    
    console.log(`✅ [CONTEXT] Conversation loaded successfully for session ${sessionId}`);
  }, [loadConversationFromDatabase, clearMessages]);

  // Enhanced real-time subscription to capture ALL message types including tool-executing
  useEffect(() => {
    if (!user?.id || !currentSessionId) {
      console.log(`🔌 [REALTIME] No user (${!!user?.id}) or session (${!!currentSessionId}) for real-time subscription`);
      return;
    }

    console.log(`🔗 [REALTIME] Setting up real-time subscription for session: ${currentSessionId}`);

    const channel = supabase
      .channel(`agent-conversations-${currentSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_conversations',
          filter: `user_id=eq.${user.id},session_id=eq.${currentSessionId}`
        },
        (payload) => {
          console.log(`📡 [REALTIME] Received INSERT event:`, payload);
          
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const newRecord = payload.new as Record<string, any>;
            
            console.log(`📨 [REALTIME] Processing new message: ${newRecord.id} (${newRecord.role}) - type: ${newRecord.message_type} - "${newRecord.content?.substring(0, 50)}..."`);
            
            // Check if this is a user message that was added locally
            if (newRecord.role === 'user' && localUserMessageIds.current.has(newRecord.id)) {
              console.log(`⚠️ [REALTIME] Skipping locally originated user message: ${newRecord.id}`);
              return;
            }
            
            // IMPORTANT: Capture tool execution messages
            if (newRecord.message_type === 'tool-executing') {
              console.log(`🔧 [REALTIME] Processing tool execution message: ${newRecord.id} - content: ${newRecord.content}`);
            }
            
            console.log(`✅ [REALTIME] Processing real-time message: ${newRecord.id} (${newRecord.role})`);
            
            const newMessage: ConversationMessage = {
              id: newRecord.id,
              role: newRecord.role,
              content: newRecord.content,
              timestamp: new Date(newRecord.created_at),
              messageType: safeMessageType(newRecord.message_type),
              loopIteration: newRecord.loop_iteration || 0,
              toolsUsed: safeToolsUsed(newRecord.tools_used),
              improvementReasoning: newRecord.improvement_reasoning
            };
            
            addMessageToContext(newMessage);
            console.log(`📨 [REALTIME] Added real-time message to context: ${newRecord.id}`);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_conversations',
          filter: `user_id=eq.${user.id},session_id=eq.${currentSessionId}`
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const newRecord = payload.new as Record<string, any>;
            console.log(`📡 [REALTIME] Processing UPDATE for message: ${newRecord.id}`);
            
            // IMPORTANT: Handle tool status updates
            if (newRecord.message_type === 'tool-executing') {
              console.log(`🔧 [REALTIME] Tool execution update: ${newRecord.id} - content: ${newRecord.content}`);
            }
            
            const updatedFields: Partial<ConversationMessage> = {
              content: newRecord.content,
              messageType: safeMessageType(newRecord.message_type),
              toolsUsed: safeToolsUsed(newRecord.tools_used),
              improvementReasoning: newRecord.improvement_reasoning
            };
            updateMessageInContext(newRecord.id, updatedFields);
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`🔌 [REALTIME] Cleaning up real-time subscription for session: ${currentSessionId}`);
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentSessionId, addMessageToContext, updateMessageInContext]);

  // Clear message tracking when session changes
  useEffect(() => {
    if (currentSessionId) {
      localUserMessageIds.current.clear();
      console.log(`🧹 [CONTEXT] Cleared user message tracking for new session: ${currentSessionId}`);
    }
  }, [currentSessionId]);

  // Debug logging for session changes
  useEffect(() => {
    console.log(`🎯 [SESSION] Current session ID changed to: ${currentSessionId}`);
  }, [currentSessionId]);

  // Debug logging for messages changes
  useEffect(() => {
    console.log(`📝 [MESSAGES] Messages array updated. Count: ${messages.length}`);
    if (messages.length > 0) {
      console.log(`📝 [MESSAGES] Latest messages:`, messages.slice(-3).map(m => ({
        id: m.id.substring(0, 8),
        role: m.role,
        messageType: m.messageType,
        content: m.content.substring(0, 30) + '...'
      })));
    }
  }, [messages]);

  const contextValue: ConversationContextType = {
    messages,
    addMessageToContext,
    updateMessageInContext,
    clearMessages,
    setMessages,
    currentSessionId,
    setCurrentSessionId,
    currentSession,
    setCurrentSession,
    sessions,
    setSessions,
    isLoading,
    setIsLoading,
    isLoadingSessions,
    setIsLoadingSessions,
    input,
    setInput,
    tools,
    setTools,
    toolsActive,
    setToolsActive,
    persistMessage,
    loadConversation,
    addAssistantResponse
  };

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversationContext must be used within a ConversationProvider');
  }
  return context;
};
