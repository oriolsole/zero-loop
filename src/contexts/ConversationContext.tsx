
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ToolProgressItem } from '@/types/tools';

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationContextType {
  // Messages
  messages: ConversationMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ConversationMessage[]>>;
  refreshMessages: () => Promise<void>;
  addMessage: (message: ConversationMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ConversationMessage>) => void;
  
  // Session management
  sessionId: string | null;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  currentSessionId: string | null;
  currentSession: Session | null;
  setCurrentSession: React.Dispatch<React.SetStateAction<Session | null>>;
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  
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
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [input, setInput] = useState('');
  const [tools, setTools] = useState<ToolProgressItem[]>([]);
  const [toolsActive, setToolsActive] = useState(false);
  const { user } = useAuth();

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

  // Refresh messages from database
  const refreshMessages = useCallback(async () => {
    if (!user?.id || !sessionId) return;

    try {
      console.log(`🔄 Refreshing messages for session: ${sessionId}`);
      
      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      if (data) {
        const formattedMessages: ConversationMessage[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          messageType: safeMessageType(msg.message_type),
          loopIteration: msg.loop_iteration || 0,
          toolsUsed: safeToolsUsed(msg.tools_used),
          improvementReasoning: msg.improvement_reasoning
        }));

        // Only update if messages have actually changed
        setMessages(prevMessages => {
          const hasChanges = JSON.stringify(prevMessages) !== JSON.stringify(formattedMessages);
          if (hasChanges) {
            console.log(`📝 Messages updated: ${formattedMessages.length} total, changes detected`);
            return formattedMessages;
          }
          return prevMessages;
        });
      }
    } catch (error) {
      console.error('Failed to refresh messages:', error);
    }
  }, [user?.id, sessionId]);

  // Add a new message to the context
  const addMessage = useCallback((message: ConversationMessage) => {
    setMessages(prev => {
      // Check if message already exists
      const exists = prev.find(m => m.id === message.id);
      if (exists) {
        console.log(`⚠️ Message ${message.id} already exists, skipping add`);
        return prev;
      }
      
      console.log(`➕ Adding message: ${message.id} (${message.role})`);
      return [...prev, message];
    });
  }, []);

  // Update an existing message in the context
  const updateMessage = useCallback((messageId: string, updates: Partial<ConversationMessage>) => {
    setMessages(prev => {
      const messageIndex = prev.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        console.log(`⚠️ Message ${messageId} not found for update`);
        return prev;
      }
      
      const updated = [...prev];
      updated[messageIndex] = { ...updated[messageIndex], ...updates };
      console.log(`🔄 Updated message: ${messageId}`);
      return updated;
    });
  }, []);

  // Set up real-time subscription for message updates
  useEffect(() => {
    if (!user?.id || !sessionId) return;

    console.log(`🔗 Setting up real-time subscription for session: ${sessionId}`);

    const channel = supabase
      .channel('agent-conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_conversations',
          filter: `user_id=eq.${user.id},session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('📡 Real-time message update:', payload.eventType, payload.new?.id);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const newMessage: ConversationMessage = {
              id: payload.new.id,
              role: payload.new.role,
              content: payload.new.content,
              timestamp: new Date(payload.new.created_at),
              messageType: safeMessageType(payload.new.message_type),
              loopIteration: payload.new.loop_iteration || 0,
              toolsUsed: safeToolsUsed(payload.new.tools_used),
              improvementReasoning: payload.new.improvement_reasoning
            };
            addMessage(newMessage);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedFields: Partial<ConversationMessage> = {
              content: payload.new.content,
              messageType: safeMessageType(payload.new.message_type),
              toolsUsed: safeToolsUsed(payload.new.tools_used),
              improvementReasoning: payload.new.improvement_reasoning
            };
            updateMessage(payload.new.id, updatedFields);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, sessionId, addMessage, updateMessage]);

  // Initial load of messages when session changes
  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  const contextValue: ConversationContextType = {
    messages,
    setMessages,
    refreshMessages,
    sessionId,
    setSessionId,
    currentSessionId: sessionId,
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
    addMessage,
    updateMessage
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
