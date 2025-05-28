
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useAgentConversation, ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useToolProgress } from '@/hooks/useToolProgress';
import SimplifiedChatInterface from './SimplifiedChatInterface';
import SimplifiedChatInput from './SimplifiedChatInput';
import SimplifiedChatHeader from './SimplifiedChatHeader';
import SessionsSidebar from './SessionsSidebar';

const AIAgentChat: React.FC = () => {
  const { user } = useAuth();
  const {
    currentSessionId,
    conversations,
    sessions,
    isLoadingSessions,
    startNewSession,
    loadSession,
    addMessage,
    updateMessage,
    getConversationHistory,
    deleteSession
  } = useAgentConversation();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [modelSettings, setModelSettings] = useState(getModelSettings());

  const {
    tools,
    isActive: toolsActive,
    startTool,
    updateTool,
    completeTool,
    failTool,
    clearTools
  } = useToolProgress();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversations, tools]);

  // Refresh conversation every 2 seconds while loading to catch loop steps
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    
    if (isLoading && currentSessionId) {
      refreshInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('agent_conversations')
            .select('*')
            .eq('session_id', currentSessionId)
            .eq('user_id', user?.id)
            .order('created_at', { ascending: true });

          if (!error && data) {
            const messages: ConversationMessage[] = data.map(row => ({
              id: row.id.toString(),
              role: row.role as ConversationMessage['role'],
              content: row.content,
              timestamp: new Date(row.created_at),
              messageType: row.message_type as ConversationMessage['messageType'] || undefined,
              toolsUsed: Array.isArray(row.tools_used) ? row.tools_used : undefined,
              loopIteration: row.loop_iteration || 0,
              improvementReasoning: row.improvement_reasoning || undefined,
              shouldContinueLoop: row.should_continue_loop || undefined
            }));

            // Update conversations if new messages found
            if (messages.length > conversations.length) {
              const newMessages = messages.slice(conversations.length);
              newMessages.forEach(msg => addMessage(msg));
            }
          }
        } catch (error) {
          console.warn('Error refreshing conversation:', error);
        }
      }, 2000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isLoading, currentSessionId, user?.id, conversations.length, addMessage]);

  // Load model settings on component mount and when they change
  useEffect(() => {
    const loadSettings = () => {
      const settings = getModelSettings();
      setModelSettings(settings);
    };

    loadSettings();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'modelSettings') {
        loadSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleFollowUpAction = async (action: string) => {
    if (!user || !currentSessionId) return;

    const followUpMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: action,
      timestamp: new Date()
    };

    addMessage(followUpMessage);
    setInput('');
    
    await processMessage(action);
  };

  const processMessage = async (message: string) => {
    if (!user || !currentSessionId) return;

    setIsLoading(true);
    clearTools();

    try {
      const conversationHistory = getConversationHistory();

      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message,
          conversationHistory,
          userId: user.id,
          sessionId: currentSessionId,
          streaming: false,
          modelSettings: modelSettings
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to get response from AI agent');
      }

      // If streamedSteps flag is true, the backend has already inserted step messages
      // We just need to refresh the conversation to show them
      if (data.streamedSteps) {
        // Allow time for final database writes to complete
        setTimeout(async () => {
          try {
            const { data: refreshData, error: refreshError } = await supabase
              .from('agent_conversations')
              .select('*')
              .eq('session_id', currentSessionId)
              .eq('user_id', user.id)
              .order('created_at', { ascending: true });

            if (!refreshError && refreshData) {
              const messages: ConversationMessage[] = refreshData.map(row => ({
                id: row.id.toString(),
                role: row.role as ConversationMessage['role'],
                content: row.content,
                timestamp: new Date(row.created_at),
                messageType: row.message_type as ConversationMessage['messageType'] || undefined,
                toolsUsed: Array.isArray(row.tools_used) ? row.tools_used : undefined,
                loopIteration: row.loop_iteration || 0,
                improvementReasoning: row.improvement_reasoning || undefined,
                shouldContinueLoop: row.should_continue_loop || undefined
              }));

              // Force refresh conversation state
              const userMessages = messages.filter(m => m.role === 'user');
              const lastUserMessage = userMessages[userMessages.length - 1];
              
              if (lastUserMessage && lastUserMessage.content === message) {
                // Load fresh conversation state
                await loadSession(currentSessionId);
              }
            }
          } catch (refreshError) {
            console.warn('Error refreshing conversation after loop:', refreshError);
          }
        }, 1000);
      } else {
        // Fallback: add traditional single response message
        const assistantMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          messageType: 'response',
          toolsUsed: data.toolsUsed || [],
          loopIteration: data.loopIteration || 0,
          improvementReasoning: data.improvementReasoning || undefined
        };

        addMessage(assistantMessage);
      }

      if (data.toolsUsed && data.toolsUsed.length > 0) {
        const successCount = data.toolsUsed.filter((tool: any) => tool.success).length;
        if (successCount > 0) {
          toast.success(`Used ${successCount} tool(s) successfully`);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      toast.error('Failed to send message', {
        description: error.message || 'Please try again.',
        duration: 10000
      });

      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      };

      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user || !currentSessionId) return;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    addMessage(userMessage);
    const messageToProcess = input;
    setInput('');
    
    await processMessage(messageToProcess);
  };

  return (
    <div className="flex h-full">
      {showSessions && (
        <SessionsSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onStartNewSession={startNewSession}
          onLoadSession={loadSession}
          onDeleteSession={deleteSession}
          isLoading={isLoadingSessions}
        />
      )}

      <div className="flex-1 flex flex-col bg-background">
        <SimplifiedChatHeader
          modelSettings={modelSettings}
          showSessions={showSessions}
          onToggleSessions={() => setShowSessions(!showSessions)}
          onNewSession={startNewSession}
          isLoading={isLoading}
        />
        
        <SimplifiedChatInterface
          conversations={conversations}
          isLoading={isLoading}
          modelSettings={modelSettings}
          tools={tools}
          toolsActive={toolsActive}
          scrollAreaRef={scrollAreaRef}
          onFollowUpAction={handleFollowUpAction}
        />
        
        <SimplifiedChatInput
          input={input}
          onInputChange={setInput}
          onSendMessage={sendMessage}
          isLoading={isLoading}
          modelProvider={modelSettings.provider}
        />
      </div>
    </div>
  );
};

export default AIAgentChat;
