
import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConversationMessage, ConversationSession } from '@/hooks/useAgentConversation';
import { ToolProgressItem } from '@/types/tools';

interface ConversationContextType {
  // Message state
  messages: ConversationMessage[];
  setMessages: (messages: ConversationMessage[]) => void;
  addMessage: (message: ConversationMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ConversationMessage>) => void;
  
  // Session state
  currentSession: ConversationSession | null;
  setCurrentSession: (session: ConversationSession | null) => void;
  sessions: ConversationSession[];
  setSessions: (sessions: ConversationSession[]) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isLoadingSessions: boolean;
  setIsLoadingSessions: (loading: boolean) => void;
  
  // Tool state
  tools: ToolProgressItem[];
  setTools: (tools: ToolProgressItem[]) => void;
  toolsActive: boolean;
  setToolsActive: (active: boolean) => void;
  
  // Input state
  input: string;
  setInput: (input: string) => void;

  // Message operations (will be implemented by useMessagePersistence)
  loadConversation?: (sessionId: string) => Promise<void>;
  persistMessage?: (message: ConversationMessage) => Promise<void>;
  refreshMessages?: () => Promise<void>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Message state
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  
  // Tool state
  const [tools, setTools] = useState<ToolProgressItem[]>([]);
  const [toolsActive, setToolsActive] = useState(false);
  
  // Input state
  const [input, setInput] = useState('');

  // Message operations
  const addMessage = useCallback((message: ConversationMessage) => {
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        console.log(`⚠️ Message ${message.id} already exists in context`);
        return prev;
      }
      console.log(`✅ Message ${message.id} added to context`);
      return [...prev, message];
    });
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<ConversationMessage>) => {
    console.log(`🔄 Updating message: ${messageId}`);
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  const contextValue: ConversationContextType = {
    // Message state
    messages,
    setMessages,
    addMessage,
    updateMessage,
    
    // Session state
    currentSession,
    setCurrentSession,
    sessions,
    setSessions,
    
    // Loading states
    isLoading,
    setIsLoading,
    isLoadingSessions,
    setIsLoadingSessions,
    
    // Tool state
    tools,
    setTools,
    toolsActive,
    setToolsActive,
    
    // Input state
    input,
    setInput
  };

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversationContext must be used within a ConversationProvider');
  }
  return context;
};
