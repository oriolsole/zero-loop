
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

  // SIMPLIFIED: Direct message addition with immediate display
  const addMessage = useCallback((message: ConversationMessage) => {
    console.log(`📝 [CONTEXT] Adding message: ${message.id} (${message.role}) - "${message.content.substring(0, 50)}..."`);
    
    // Track user messages as local
    if (message.role === 'user') {
      localMessageIds.current.add(message.id);
    }
    
    setMessages(prev => {
      // Check if message already exists
      if (prev.find(m => m.id === message.id)) {
        console.log(`⚠️ [CONTEXT] Message ${message.id} already exists, skipping`);
        return prev;
      }
      
      // Add and sort by timestamp - IMMEDIATE display
      const newMessages = [...prev, message].sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      console.log(`✅ [CONTEXT] Message added (total: ${newMessages.length})`);
      return newMessages;
    });

    // Handle tool execution messages immediately
    if (message.messageType === 'tool-executing' && message.content.startsWith('{')) {
      try {
        const toolData = JSON.parse(message.content);
        console.log(`🔧 [CONTEXT] Processing tool execution:`, toolData);
        
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
          
          console.log(`🛠️ [CONTEXT] Setting active tool:`, toolItem);
          setActiveTool(toolItem);
          
          // Clear tool after completion/failure
          if (toolData.status === 'completed' || toolData.status === 'failed') {
            setTimeout(() => {
              console.log(`🧹 [CONTEXT] Clearing completed tool: ${toolItem.id}`);
              setActiveTool(null);
            }, 5000);
          }
        }
      } catch (e) {
        console.warn('Failed to parse tool execution message:', e);
      }
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    console.log('🧹 [CONTEXT] Clearing all messages');
    setMessages([]);
    setActiveTool(null);
    localMessageIds.current.clear();
  }, []);

  // Persist message to database
  const persistMessage = useCallback(async (message: ConversationMessage): Promise<boolean> => {
    if (!currentSessionId) {
      console.error('❌ [CONTEXT] No session for persistence');
      return false;
    }

    console.log(`💾 [CONTEXT] Persisting message: ${message.id}`);
    const result = await persistMessageToDatabase(message, currentSessionId);
    console.log(`${result ? '✅' : '❌'} [CONTEXT] Persistence ${result ? 'succeeded' : 'failed'}`);
    return result;
  }, [currentSessionId, persistMessageToDatabase]);

  // Load conversation - SIMPLIFIED
  const loadConversation = useCallback(async (sessionId: string) => {
    console.log(`📂 [CONTEXT] Loading conversation: ${sessionId}`);
    clearMessages();
    
    try {
      const loadedMessages = await loadConversationFromDatabase(sessionId);
      console.log(`📥 [CONTEXT] Loaded ${loadedMessages.length} messages`);
      
      // Add messages immediately - no delays
      loadedMessages.forEach(message => {
        addMessage(message);
      });
      
      console.log(`✅ [CONTEXT] Conversation loaded successfully`);
    } catch (error) {
      console.error(`❌ [CONTEXT] Failed to load conversation:`, error);
    }
  }, [loadConversationFromDatabase, clearMessages, addMessage]);

  // SIMPLIFIED: Real-time subscription with immediate processing
  useEffect(() => {
    if (!user?.id || !currentSessionId) {
      console.log(`🔌 [REALTIME] No user or session for subscription`);
      return;
    }

    console.log(`🔗 [REALTIME] Setting up subscription for session: ${currentSessionId}`);

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
          console.log(`📡 [REALTIME] Received INSERT:`, payload);
          
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const record = payload.new as Record<string, any>;
            
            // Skip user messages that were added locally
            if (record.role === 'user' && localMessageIds.current.has(record.id)) {
              console.log(`⚠️ [REALTIME] Skipping local user message: ${record.id}`);
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
            
            console.log(`📨 [REALTIME] Adding real-time message: ${record.id} (${record.role})`);
            addMessage(newMessage);
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`🔌 [REALTIME] Cleaning up subscription`);
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentSessionId, addMessage]);

  // Clear tracking when session changes
  useEffect(() => {
    if (currentSessionId) {
      localMessageIds.current.clear();
      console.log(`🧹 [CONTEXT] Cleared tracking for new session: ${currentSessionId}`);
    }
  }, [currentSessionId]);

  const contextValue: ConversationContextType = {
    messages,
    addMessage,
    clearMessages,
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
