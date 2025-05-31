import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ConversationMessage, ConversationSession } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { ToolProgressItem } from '@/types/tools';
import { useMessageManager } from '@/hooks/conversation/useMessageManager';
import { useMessagePolling } from '@/hooks/conversation/useMessagePolling';
import { Agent } from '@/services/agentService';

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
  
  // Agent management
  currentAgent: Agent | null;
  setCurrentAgent: React.Dispatch<React.SetStateAction<Agent | null>>;
  
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
  updateSessionTitle: (sessionId: string, title: string) => void;
  
  // Add orchestration state
  currentPlan: any | null;
  isOrchestrating: boolean;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [input, setInput] = useState('');
  const [activeTool, setActiveTool] = useState<ToolProgressItem | null>(null);
  const [currentPlan, setCurrentPlan] = useState<any | null>(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const { user } = useAuth();
  const { persistMessageToDatabase, loadConversationFromDatabase } = useMessageManager();

  // Enhanced timestamp tracking that considers both created_at and updated_at
  const lastMessageTimestamp = useMemo(() => {
    if (messages.length === 0) return null;
    
    // Find the most recent timestamp from all messages, considering both timestamp and updatedAt
    const latestTimestamp = messages.reduce((latest, message) => {
      const messageTime = message.timestamp.getTime();
      const updatedTime = message.updatedAt?.getTime() || messageTime;
      const maxTime = Math.max(messageTime, updatedTime);
      return maxTime > latest ? maxTime : latest;
    }, 0);
    
    return latestTimestamp > 0 ? new Date(latestTimestamp) : null;
  }, [messages]);

  // Helper to generate session title from first user message
  const generateSessionTitle = useCallback((firstMessage: string): string => {
    const truncated = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...' 
      : firstMessage;
    return truncated;
  }, []);

  // Update session title when first user message is added
  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    console.log(`📝 [CONTEXT] Updating session title: ${sessionId} -> ${title}`);
    
    // Update current session if it matches
    setCurrentSession(prev => {
      if (prev && prev.id === sessionId) {
        return { ...prev, title };
      }
      return prev;
    });

    // Update sessions list
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, title, updated_at: new Date() }
        : session
    ));
  }, []);

  // Enhanced message update/replacement for tool updates
  const updateOrAddMessage = useCallback((newMessage: ConversationMessage) => {
    setMessages(prev => {
      // Check if this is an update to an existing message (same content but different timestamp/status)
      const existingIndex = prev.findIndex(m => 
        m.id === newMessage.id || 
        (m.role === newMessage.role && m.content === newMessage.content && m.messageType === newMessage.messageType)
      );
      
      if (existingIndex !== -1) {
        // Update the existing message with new timestamp data
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...newMessage,
          updatedAt: newMessage.updatedAt || new Date() // Ensure we track when it was updated
        };
        console.log(`🔄 [CONTEXT] Updated existing message: ${newMessage.id}`);
        return updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      } else {
        // Add new message
        console.log(`➕ [CONTEXT] Added new message: ${newMessage.id}`);
        return [...prev, newMessage].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }
    });
  }, []);

  // Simple add message with automatic session title update
  const addMessage = useCallback((message: ConversationMessage) => {
    console.log(`📝 [CONTEXT] Adding message: ${message.id} (${message.role}) - type: ${message.messageType || 'none'}`);
    
    updateOrAddMessage(message);

    // Update session title if this is the first user message
    if (message.role === 'user' && currentSessionId) {
      const isFirstUserMessage = messages.filter(m => m.role === 'user').length === 0;
      if (isFirstUserMessage) {
        const title = generateSessionTitle(message.content);
        updateSessionTitle(currentSessionId, title);
      }
    }

    // Handle tool execution messages
    if (message.messageType === 'tool-executing' && message.content.startsWith('{')) {
      try {
        const toolData = JSON.parse(message.content);
        console.log(`🔧 [CONTEXT] Processing tool execution:`, {
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
          
          console.log(`🛠️ [CONTEXT] Setting active tool:`, toolItem.name, toolItem.status);
          setActiveTool(toolItem);
          
          // Clear tool after completion/failure
          if (toolData.status === 'completed' || toolData.status === 'failed') {
            setTimeout(() => {
              console.log(`🧹 [CONTEXT] Clearing completed tool: ${toolItem.id}`);
              setActiveTool(null);
            }, 8000);
          }
        }
      } catch (e) {
        console.warn('Failed to parse tool execution message:', e);
      }
    }
  }, [currentSessionId, messages, generateSessionTitle, updateSessionTitle, updateOrAddMessage]);

  // Enhanced handling of polling messages with proper update detection
  const handlePollingMessages = useCallback((polledMessages: ConversationMessage[]) => {
    console.log(`📥 [POLLING] Processing ${polledMessages.length} polled messages`);
    
    polledMessages.forEach(msg => {
      console.log(`🔍 [POLLING] Processing message: ${msg.id} (${msg.role}) - type: ${msg.messageType || 'none'}, updatedAt: ${msg.updatedAt?.toISOString() || 'none'}`);
      
      // Use updateOrAddMessage which handles both new and updated messages
      updateOrAddMessage(msg);
      
      // Process tool messages for active tool updates
      if (msg.messageType === 'tool-executing' && msg.content.startsWith('{')) {
        try {
          const toolData = JSON.parse(msg.content);
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
            
            console.log(`🛠️ [POLLING] Setting active tool from polling:`, toolItem.name, toolItem.status);
            setActiveTool(toolItem);
            
            if (toolData.status === 'completed' || toolData.status === 'failed') {
              setTimeout(() => {
                console.log(`🧹 [POLLING] Clearing completed tool: ${toolItem.id}`);
                setActiveTool(null);
              }, 8000);
            }
          }
        } catch (e) {
          console.warn('Failed to parse tool execution message from polling:', e);
        }
      }
    });
  }, [updateOrAddMessage]);

  // Set up polling hook with enhanced timestamp tracking
  useMessagePolling({
    sessionId: currentSessionId,
    isLoading,
    onMessagesReceived: handlePollingMessages,
    lastMessageTimestamp
  });

  // Add assistant response (for compatibility)
  const addAssistantResponse = useCallback((message: ConversationMessage) => {
    console.log(`🤖 [CONTEXT] Adding assistant response: ${message.id}`);
    addMessage(message);
  }, [addMessage]);

  // Clear messages
  const clearMessages = useCallback(() => {
    console.log('🧹 [CONTEXT] Clearing all messages');
    setMessages([]);
    setActiveTool(null);
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

  // Load conversation 
  const loadConversation = useCallback(async (sessionId: string) => {
    console.log(`📂 [CONTEXT] Loading conversation: ${sessionId}`);
    clearMessages();
    
    try {
      const loadedMessages = await loadConversationFromDatabase(sessionId);
      console.log(`📥 [CONTEXT] Loaded ${loadedMessages.length} messages from database`);
      
      // Add all loaded messages
      loadedMessages.forEach((message, index) => {
        console.log(`📨 [CONTEXT] Loading message ${index + 1}/${loadedMessages.length}: ${message.id} (${message.role}) - type: ${message.messageType || 'none'}`);
        updateOrAddMessage(message);
      });
      
      console.log(`✅ [CONTEXT] Conversation loaded successfully`);
    } catch (error) {
      console.error(`❌ [CONTEXT] Failed to load conversation:`, error);
    }
  }, [loadConversationFromDatabase, clearMessages, updateOrAddMessage]);

  const value: ConversationContextType = {
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
    currentAgent,
    setCurrentAgent,
    isLoading,
    setIsLoading,
    isLoadingSessions,
    setIsLoadingSessions,
    input,
    setInput,
    activeTool,
    setActiveTool,
    persistMessage,
    loadConversation,
    updateSessionTitle,
    currentPlan,
    isOrchestrating
  };

  return (
    <ConversationContext.Provider value={value}>
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
