
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ConversationMessage, ConversationSession } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { ToolProgressItem } from '@/types/tools';
import { useMessageManager } from '@/hooks/conversation/useMessageManager';
import { useMessagePolling } from '@/hooks/conversation/useMessagePolling';

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

  // Track user messages to prevent duplicates during polling
  const userMessageIds = useRef<Set<string>>(new Set());
  
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

  // Simple add message without complex tracking
  const addMessage = useCallback((message: ConversationMessage) => {
    console.log(`📝 [CONTEXT] Adding message: ${message.id} (${message.role}) - type: ${message.messageType || 'none'}`);
    
    // Track user messages to prevent duplicates
    if (message.role === 'user') {
      userMessageIds.current.add(message.id);
    }
    
    setMessages(prev => {
      // Check if message already exists
      const existingIndex = prev.findIndex(m => m.id === message.id);
      if (existingIndex !== -1) {
        console.log(`⚠️ [CONTEXT] Message ${message.id} already exists, skipping`);
        return prev;
      }
      
      // Add and sort by timestamp
      const newMessages = [...prev, message].sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      console.log(`✅ [CONTEXT] Message added successfully (total: ${newMessages.length})`);
      return newMessages;
    });

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
  }, []);

  // Handle polling messages received
  const handlePollingMessages = useCallback((polledMessages: ConversationMessage[]) => {
    console.log(`📥 [POLLING] Processing ${polledMessages.length} polled messages`);
    
    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const newMessages = polledMessages.filter(msg => {
        // Skip user messages that we've already added locally
        if (msg.role === 'user' && userMessageIds.current.has(msg.id)) {
          return false;
        }
        // Skip messages we already have
        return !existingIds.has(msg.id);
      });
      
      if (newMessages.length > 0) {
        console.log(`✅ [POLLING] Adding ${newMessages.length} new messages from polling`);
        
        // Process tool messages for active tool updates
        newMessages.forEach(msg => {
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
        
        return [...prev, ...newMessages].sort((a, b) => 
          a.timestamp.getTime() - b.timestamp.getTime()
        );
      }
      
      return prev;
    });
  }, []);

  // Set up polling hook
  useMessagePolling({
    sessionId: currentSessionId,
    isLoading,
    onMessagesReceived: handlePollingMessages,
    currentMessageCount: messages.length
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
    userMessageIds.current.clear();
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
        addMessage(message);
      });
      
      console.log(`✅ [CONTEXT] Conversation loaded successfully`);
    } catch (error) {
      console.error(`❌ [CONTEXT] Failed to load conversation:`, error);
    }
  }, [loadConversationFromDatabase, clearMessages, addMessage]);

  // Clear tracking when session changes
  useEffect(() => {
    if (currentSessionId) {
      userMessageIds.current.clear();
      console.log(`🧹 [CONTEXT] Cleared user tracking for new session: ${currentSessionId}`);
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
