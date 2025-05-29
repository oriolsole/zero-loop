
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
    console.log(`📝 [LIVE-MSG] Adding message: ${message.id} (${message.role}) - type: ${message.messageType || 'none'}`);
    
    setMessages(prev => {
      // Check if message already exists by ID
      const existingIndex = prev.findIndex(m => m.id === message.id);
      if (existingIndex !== -1) {
        console.log(`⚠️ [LIVE-MSG] Message ${message.id} already exists, updating instead`);
        // Update existing message
        const updated = [...prev];
        updated[existingIndex] = message;
        return updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }
      
      // Add new message and sort by timestamp
      const newMessages = [...prev, message].sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      console.log(`✅ [LIVE-MSG] Message added successfully (total: ${newMessages.length})`);
      return newMessages;
    });

    // Enhanced tool execution message handling
    if (message.messageType === 'tool-executing' && message.content.startsWith('{')) {
      try {
        const toolData = JSON.parse(message.content);
        console.log(`🔧 [LIVE-MSG] Processing tool execution:`, {
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
          
          console.log(`🛠️ [LIVE-MSG] Setting active tool:`, toolItem.name, toolItem.status);
          setActiveTool(toolItem);
          
          // Clear tool after completion/failure
          if (toolData.status === 'completed' || toolData.status === 'failed') {
            setTimeout(() => {
              console.log(`🧹 [LIVE-MSG] Clearing completed tool: ${toolItem.id}`);
              setActiveTool(null);
            }, 8000);
          }
        }
      } catch (e) {
        console.warn('Failed to parse tool execution message:', e);
      }
    }
  }, []);

  // Add assistant response (for compatibility)
  const addAssistantResponse = useCallback((message: ConversationMessage) => {
    console.log(`🤖 [LIVE-MSG] Adding assistant response: ${message.id}`);
    addMessage(message);
  }, [addMessage]);

  // Clear messages
  const clearMessages = useCallback(() => {
    console.log('🧹 [LIVE-MSG] Clearing all messages');
    setMessages([]);
    setActiveTool(null);
  }, []);

  // Persist message to database
  const persistMessage = useCallback(async (message: ConversationMessage): Promise<boolean> => {
    if (!currentSessionId) {
      console.error('❌ [LIVE-MSG] No session for persistence');
      return false;
    }

    console.log(`💾 [LIVE-MSG] Persisting message: ${message.id}`);
    const result = await persistMessageToDatabase(message, currentSessionId);
    console.log(`${result ? '✅' : '❌'} [LIVE-MSG] Persistence ${result ? 'succeeded' : 'failed'}`);
    return result;
  }, [currentSessionId, persistMessageToDatabase]);

  // Load conversation with better error handling
  const loadConversation = useCallback(async (sessionId: string) => {
    console.log(`📂 [LIVE-MSG] Loading conversation: ${sessionId}`);
    clearMessages();
    
    try {
      const loadedMessages = await loadConversationFromDatabase(sessionId);
      console.log(`📥 [LIVE-MSG] Loaded ${loadedMessages.length} messages from database`);
      
      // Process each message
      loadedMessages.forEach((message, index) => {
        console.log(`📨 [LIVE-MSG] Loading message ${index + 1}/${loadedMessages.length}: ${message.id} (${message.role}) - type: ${message.messageType || 'none'}`);
        addMessage(message);
      });
      
      console.log(`✅ [LIVE-MSG] Conversation loaded successfully`);
    } catch (error) {
      console.error(`❌ [LIVE-MSG] Failed to load conversation:`, error);
    }
  }, [loadConversationFromDatabase, clearMessages, addMessage]);

  // Simplified real-time subscription - NO FILTERING
  useEffect(() => {
    if (!user?.id || !currentSessionId) {
      console.log(`🔌 [REALTIME] No user (${!!user?.id}) or session (${!!currentSessionId}) for subscription`);
      return;
    }

    console.log(`🔗 [REALTIME] Setting up SIMPLIFIED subscription for session: ${currentSessionId}`);

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
          console.log(`📡 [REALTIME] Received INSERT payload for ${payload.new?.id}:`, {
            role: payload.new?.role,
            messageType: payload.new?.message_type,
            contentPreview: payload.new?.content?.substring(0, 50) + '...'
          });
          
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const record = payload.new as Record<string, any>;
            
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
            
            console.log(`📨 [REALTIME] Processing real-time message: ${record.id} (${record.role}) - type: ${record.message_type || 'none'}`);
            
            // ALWAYS add the message - no filtering
            addMessage(newMessage);
            
            console.log(`🎯 [REALTIME] Real-time message added successfully`);
          } else {
            console.warn(`⚠️ [REALTIME] Invalid payload structure:`, payload);
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔗 [REALTIME] Subscription status: ${status}`);
      });

    return () => {
      console.log(`🔌 [REALTIME] Cleaning up subscription for session: ${currentSessionId}`);
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentSessionId, addMessage]);

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
