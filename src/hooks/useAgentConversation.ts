
import { useState, useCallback, useContext, createContext } from 'react';

export type AgentMessageType = 
  | 'analysis'
  | 'planning'
  | 'execution'
  | 'tool-update'
  | 'response'
  | 'step-executing'
  | 'step-completed'
  | 'loop-start'
  | 'loop-reflection'
  | 'loop-enhancement'
  | 'loop-complete'
  | 'tool-executing'
  | 'tool-result';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  updatedAt?: Date;
  messageType?: AgentMessageType;
  loopIteration?: number;
  toolsUsed?: { name: string; success: boolean; result?: any }[];
  improvementReasoning?: string;
  selfReflection?: string;
  toolDecision?: {
    reasoning: string;
    selectedTools: string[];
  };
  aiReasoning?: string;
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

interface ConversationContextProps {
  messages: ConversationMessage[];
  addMessage: (message: ConversationMessage) => void;
  updateMessage: (message: ConversationMessage) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  input: string;
  setInput: (input: string) => void;
  activeTool: any | null;
  setActiveTool: (tool: any | null) => void;
  currentPlan: any | null;
  setCurrentPlan: (plan: any | null) => void;
  isOrchestrating: boolean;
  setIsOrchestrating: (isOrchestrating: boolean) => void;
  currentAgent: any | null;
  setCurrentAgent: (agent: any | null) => void;
}

const ConversationContext = createContext<ConversationContextProps>({
  messages: [],
  addMessage: () => {},
  updateMessage: () => {},
  removeMessage: () => {},
  clearMessages: () => {},
  currentSessionId: null,
  setCurrentSessionId: () => {},
  isLoading: false,
  setIsLoading: () => {},
  input: '',
  setInput: () => {},
  activeTool: null,
  setActiveTool: () => {},
  currentPlan: null,
  setCurrentPlan: () => {},
  isOrchestrating: false,
  setIsOrchestrating: () => {},
  currentAgent: null,
  setCurrentAgent: () => {},
});

export const ConversationProvider = ConversationContext.Provider;

export const useConversationContext = () => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [activeTool, setActiveTool] = useState<any | null>(null);
  const [currentPlan, setCurrentPlan] = useState<any | null>(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<any | null>(null);

  const addMessage = useCallback((message: ConversationMessage) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  }, []);

  const updateMessage = useCallback((message: ConversationMessage) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) => (msg.id === message.id ? message : msg))
    );
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== messageId));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    currentSessionId,
    setCurrentSessionId,
    isLoading,
    setIsLoading,
    input,
    setInput,
    activeTool,
    setActiveTool,
    currentPlan,
    setCurrentPlan,
    isOrchestrating,
    setIsOrchestrating,
    currentAgent,
    setCurrentAgent
  };
};
