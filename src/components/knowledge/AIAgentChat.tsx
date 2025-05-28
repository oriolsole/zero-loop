
import React, { useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useToolProgress } from '@/hooks/useToolProgress';
import { useConversationContext } from '@/contexts/ConversationContext';
import { useMessagePersistence } from '@/hooks/conversation/useMessagePersistence';
import { useSessionManager } from '@/hooks/conversation/useSessionManager';
import SimplifiedChatInterface from './SimplifiedChatInterface';
import SimplifiedChatInput from './SimplifiedChatInput';
import SimplifiedChatHeader from './SimplifiedChatHeader';
import SessionsSidebar from './SessionsSidebar';

const AIAgentChat: React.FC = () => {
  const { user } = useAuth();

  // Use context for UI state
  const {
    messages,
    currentSessionId,
    isLoading,
    setIsLoading,
    input,
    setInput,
    tools,
    setTools,
    toolsActive,
    setToolsActive,
    setCurrentSession
  } = useConversationContext();

  // Use session manager for session operations
  const { 
    sessions,
    isLoadingSessions,
    loadExistingSessions,
    startNewSession,
    deleteSession
  } = useSessionManager();

  // Use message persistence hook
  const { 
    loadConversation,
    addMessage: persistMessage,
    refreshConversationState: refreshMessages
  } = useMessagePersistence();

  const [showSessions, setShowSessions] = React.useState(false);
  const [modelSettings, setModelSettings] = React.useState(getModelSettings());

  // Track active requests to prevent duplicates
  const activeRequests = useRef<Set<string>>(new Set());
  
  const {
    tools: hookTools,
    isActive: hookToolsActive,
    startTool,
    updateTool,
    completeTool,
    failTool,
    clearTools
  } = useToolProgress();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Sync tools from hook to context
  useEffect(() => {
    setTools(hookTools);
    setToolsActive(hookToolsActive);
  }, [hookTools, hookToolsActive, setTools, setToolsActive]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, tools]);

  // Helper function to safely convert tools_used from database
  const convertToolsUsed = (toolsUsed: any): Array<{name: string; success: boolean; result?: any; error?: string;}> => {
    if (!toolsUsed) return [];
    
    if (typeof toolsUsed === 'string') {
      try {
        toolsUsed = JSON.parse(toolsUsed);
      } catch {
        return [];
      }
    }
    
    if (!Array.isArray(toolsUsed)) return [];
    
    return toolsUsed.map((tool: any) => {
      if (typeof tool === 'object' && tool !== null) {
        return {
          name: tool.name || 'Unknown Tool',
          success: Boolean(tool.success),
          result: tool.result,
          error: tool.error
        };
      }
      return {
        name: 'Unknown Tool',
        success: false,
        error: 'Invalid tool data'
      };
    });
  };

  // Refresh conversation every 4 seconds while loading, but with throttling
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    
    if (isLoading && currentSessionId) {
      refreshInterval = setInterval(() => {
        if (refreshMessages) {
          refreshMessages();
        }
      }, 4000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isLoading, currentSessionId, refreshMessages]);

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

  // Load sessions on mount
  useEffect(() => {
    if (user && sessions.length === 0 && !isLoadingSessions) {
      loadExistingSessions();
    }
  }, [user, sessions.length, loadExistingSessions, isLoadingSessions]);

  // Auto-start new session if none exists
  useEffect(() => {
    if (user && !currentSessionId && sessions.length === 0 && !isLoadingSessions) {
      startNewSession();
    }
  }, [user, currentSessionId, sessions.length, startNewSession, isLoadingSessions]);

  // Handle session loading with new persistence hook
  const handleLoadSession = async (sessionId: string) => {
    if (!loadConversation) return;
    
    // Find session data from sessions list
    const sessionData = sessions.find(s => s.id === sessionId);
    if (sessionData) {
      setCurrentSession(sessionData);
    }

    // Load messages for this session
    await loadConversation(sessionId);
  };

  const handleFollowUpAction = async (action: string) => {
    if (!user || !currentSessionId) return;

    const followUpMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: action,
      timestamp: new Date()
    };

    if (persistMessage) {
      await persistMessage(followUpMessage);
    }
    setInput('');
    
    await processMessage(action);
  };

  const processMessage = async (message: string) => {
    if (!user || !currentSessionId) return;

    // Create a unique request key to prevent duplicates
    const requestKey = `${currentSessionId}-${Date.now()}-${message.substring(0, 50)}`;
    
    if (activeRequests.current.has(requestKey)) {
      console.log('Request already in progress, skipping');
      return;
    }

    activeRequests.current.add(requestKey);
    setIsLoading(true);
    clearTools();

    try {
      const conversationHistory = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant').map(msg => ({
        role: msg.role,
        content: msg.content
      }));

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
      if (data.streamedSteps) {
        // Refresh conversation to show new messages
        setTimeout(() => {
          if (refreshMessages) {
            refreshMessages();
          }
        }, 2000);
      } else {
        // Fallback: add traditional single response message
        const assistantMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          messageType: 'response',
          toolsUsed: convertToolsUsed(data.toolsUsed) || [],
          loopIteration: data.loopIteration || 0,
          improvementReasoning: data.improvementReasoning || undefined
        };

        if (persistMessage) {
          await persistMessage(assistantMessage);
        }
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

      if (persistMessage) {
        await persistMessage(errorMessage);
      }
    } finally {
      setIsLoading(false);
      activeRequests.current.delete(requestKey);
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

    if (persistMessage) {
      await persistMessage(userMessage);
    }
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
          onLoadSession={handleLoadSession}
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
          conversations={messages}
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
