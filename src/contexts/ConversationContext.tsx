
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ConversationMessage, ConversationSession } from '@/hooks/useAgentConversation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ToolProgressItem } from '@/types/tools';

interface ConversationContextType {
  // Messages
  messages: ConversationMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ConversationMessage[]>>;
  refreshMessages: () => Promise<void>;
  addMessage: (message: ConversationMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ConversationMessage>) => void;
  
  // Session management - using ConversationSession for consistency
  sessionId: string | null;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
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
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
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
          console.log('📡 Real-time message update:', payload.eventType, payload.new);
          
          // Enhanced type safety for payload handling
          if (payload.eventType === 'INSERT' && payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const newRecord = payload.new as Record<string, any>;
            
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
            addMessage(newMessage);
          } else if (payload.eventType === 'UPDATE' && payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const newRecord = payload.new as Record<string, any>;
            
            const updatedFields: Partial<ConversationMessage> = {
              content: newRecord.content,
              messageType: safeMessageType(newRecord.message_type),
              toolsUsed: safeToolsUsed(newRecord.tools_used),
              improvementReasoning: newRecord.improvement_reasoning
            };
            updateMessage(newRecord.id, updatedFields);
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
    setCurrentSessionId: setSessionId, // Use the same setter for consistency
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
