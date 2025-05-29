
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ConversationMessage, ConversationSession } from '@/hooks/useAgentConversation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ToolProgressItem } from '@/types/tools';
import { useMessageManager } from '@/hooks/conversation/useMessageManager';

interface ConversationContextType {
  // Messages - simplified state management
  messages: ConversationMessage[];
  addMessage: (message: ConversationMessage) => void;
  clearMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ConversationMessage[]>>;
  addAssistantResponse: (message: ConversationMessage) => void;
  
  // Session management
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
  
  // Tools - simplified
  activeTool: ToolProgressItem | null;
  setActiveTool: React.Dispatch<React.SetStateAction<ToolProgressItem | null>>;

  // Database operations
  persistMessage: (message: ConversationMessage) => Promise<boolean>;
  loadConversation: (sessionId: string) => Promise<void>;
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
  const [activeTool, setActiveTool] = useState<ToolProgressItem | null>(null);
  const { user } = useAuth();
  const { persistMessageToDatabase, loadConversationFromDatabase } = useMessageManager();

  // Track locally added messages to prevent duplicates
  const localMessageIds = useRef<Set<string>>(new Set());
  
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

  // Enhanced add message with better real-time handling
  const addMessage = useCallback((message: ConversationMessage) => {
    console.log(`📝 [REALTIME-CONTEXT] Adding message: ${message.id} (${message.role}) - type: ${message.messageType || 'none'}`);
    
    // Track user messages as local to prevent duplicates from realtime
    if (message.role === 'user') {
      localMessageIds.current.add(message.id);
      console.log(`👤 [REALTIME-CONTEXT] Tracked user message: ${message.id}`);
    }
    
    setMessages(prev => {
      // Check if message already exists
      const existingIndex = prev.findIndex(m => m.id === message.id);
      if (existingIndex !== -1) {
        console.log(`⚠️ [REALTIME-CONTEXT] Message ${message.id} already exists, skipping`);
        return prev;
      }
      
      // Add and sort by timestamp for consistent ordering
      const newMessages = [...prev, message].sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      console.log(`✅ [REALTIME-CONTEXT] Message added successfully (total: ${newMessages.length})`);
      return newMessages;
    });

    // Enhanced tool execution message handling
    if (message.messageType === 'tool-executing' && message.content.startsWith('{')) {
      try {
        const toolData = JSON.parse(message.content);
        console.log(`🔧 [REALTIME-CONTEXT] Processing tool execution:`, {
          toolName: toolData.toolName,
          status: toolData.status,
          toolCallId: toolData.toolCallId
        });
        
        if (toolData.toolName && toolData.status) {
          const toolItem: ToolProgressItem = {
            id: toolData.toolCallId || `tool-${Date.now()}`,
            name: toolData.toolName,
            displayName: toolData.displayName || toolData.toolName,
            status: toolData.status as any,
            startTime: toolData.startTime || new Date().toISOString(),
            endTime: toolData.endTime,
            parameters: toolData.parameters || {},
            result: toolData.result,
            error: toolData.error,
            progress: toolData.progress || (
              toolData.status === 'completed' ? 100 : 
              toolData.status === 'failed' ? 0 : 50
            )
          };
          
          console.log(`🛠️ [REALTIME-CONTEXT] Setting active tool:`, toolItem.name, toolItem.status);
          setActiveTool(toolItem);
          
          // Clear tool after completion/failure with longer delay for visibility
          if (toolData.status === 'completed' || toolData.status === 'failed') {
            setTimeout(() => {
              console.log(`🧹 [REALTIME-CONTEXT] Clearing completed tool: ${toolItem.id}`);
              setActiveTool(null);
            }, 8000); // Increased from 5s to 8s for better visibility
          }
        }
      } catch (e) {
        console.warn('Failed to parse tool execution message:', e);
      }
    }
  }, []);

  // Add assistant response (for compatibility)
  const addAssistantResponse = useCallback((message: ConversationMessage) => {
    console.log(`🤖 [REALTIME-CONTEXT] Adding assistant response: ${message.id}`);
    addMessage(message);
  }, [addMessage]);

  // Clear messages
  const clearMessages = useCallback(() => {
    console.log('🧹 [REALTIME-CONTEXT] Clearing all messages');
    setMessages([]);
    setActiveTool(null);
    localMessageIds.current.clear();
  }, []);

  // Persist message to database
  const persistMessage = useCallback(async (message: ConversationMessage): Promise<boolean> => {
    if (!currentSessionId) {
      console.error('❌ [REALTIME-CONTEXT] No session for persistence');
      return false;
    }

    console.log(`💾 [REALTIME-CONTEXT] Persisting message: ${message.id}`);
    const result = await persistMessageToDatabase(message, currentSessionId);
    console.log(`${result ? '✅' : '❌'} [REALTIME-CONTEXT] Persistence ${result ? 'succeeded' : 'failed'}`);
    return result;
  }, [currentSessionId, persistMessageToDatabase]);

  // Load conversation with better error handling
  const loadConversation = useCallback(async (sessionId: string) => {
    console.log(`📂 [REALTIME-CONTEXT] Loading conversation: ${sessionId}`);
    clearMessages();
    
    try {
      const loadedMessages = await loadConversationFromDatabase(sessionId);
      console.log(`📥 [REALTIME-CONTEXT] Loaded ${loadedMessages.length} messages from database`);
      
      // Process each message type correctly with detailed logging
      loadedMessages.forEach((message, index) => {
        console.log(`📨 [REALTIME-CONTEXT] Loading message ${index + 1}/${loadedMessages.length}: ${message.id} (${message.role}) - type: ${message.messageType || 'none'}`);
        addMessage(message);
      });
      
      console.log(`✅ [REALTIME-CONTEXT] Conversation loaded successfully`);
    } catch (error) {
      console.error(`❌ [REALTIME-CONTEXT] Failed to load conversation:`, error);
    }
  }, [loadConversationFromDatabase, clearMessages, addMessage]);

  // Enhanced real-time subscription with improved filtering and logging
  useEffect(() => {
    if (!user?.id || !currentSessionId) {
      console.log(`🔌 [REALTIME-SUB] No user (${!!user?.id}) or session (${!!currentSessionId}) for subscription`);
      return;
    }

    console.log(`🔗 [REALTIME-SUB] Setting up enhanced subscription for session: ${currentSessionId}`);

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
          console.log(`📡 [REALTIME-SUB] Received INSERT payload:`, {
            id: payload.new?.id,
            role: payload.new?.role,
            messageType: payload.new?.message_type,
            contentPreview: payload.new?.content?.substring(0, 50) + '...'
          });
          
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const record = payload.new as Record<string, any>;
            
            // More lenient filtering for real-time messages
            if (record.role === 'user' && localMessageIds.current.has(record.id)) {
              console.log(`⚠️ [REALTIME-SUB] Skipping duplicate local user message: ${record.id}`);
              return;
            }
            
            const newMessage: ConversationMessage = {
              id: record.id,
              role: record.role,
              content: record.content,
              timestamp: new Date(record.created_at),
              messageType: safeMessageType(record.message_type),
              loopIteration: record.loop_iteration || 0,
              toolsUsed: safeToolsUsed(record.tools_used),
              improvementReasoning: record.improvement_reasoning
            };
            
            console.log(`📨 [REALTIME-SUB] Processing real-time message: ${record.id} (${record.role}) - type: ${record.message_type || 'none'}`);
            
            // Immediately add to context - this is the critical fix
            addMessage(newMessage);
            
            console.log(`🎯 [REALTIME-SUB] Real-time message added to context successfully`);
          } else {
            console.warn(`⚠️ [REALTIME-SUB] Invalid payload structure:`, payload);
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔗 [REALTIME-SUB] Subscription status: ${status}`);
      });

    return () => {
      console.log(`🔌 [REALTIME-SUB] Cleaning up subscription for session: ${currentSessionId}`);
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentSessionId, addMessage]);

  // Clear tracking when session changes
  useEffect(() => {
    if (currentSessionId) {
      localMessageIds.current.clear();
      console.log(`🧹 [REALTIME-CONTEXT] Cleared local tracking for new session: ${currentSessionId}`);
    }
  }, [currentSessionId]);

  const contextValue: ConversationContextType = {
    messages,
    addMessage,
    clearMessages,
    setMessages,
    addAssistantResponse,
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
    activeTool,
    setActiveTool,
    persistMessage,
    loadConversation
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
