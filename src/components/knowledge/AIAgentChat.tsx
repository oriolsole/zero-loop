
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
    messages = [],
    currentSessionId,
    isLoading = false,
    setIsLoading,
    input = '',
    setInput,
    tools = [],
    setTools,
    toolsActive = false,
    setToolsActive,
    setCurrentSession,
    refreshMessages
  } = useConversationContext();

  // Use session manager for session operations
  const { 
    sessions = [],
    isLoadingSessions = false,
    loadExistingSessions,
    startNewSession,
    deleteSession
  } = useSessionManager();

  // Use message persistence hook
  const { 
    loadConversation,
    addMessage: persistMessage
  } = useMessagePersistence();

  const [showSessions, setShowSessions] = React.useState(false);
  const [modelSettings, setModelSettings] = React.useState(getModelSettings());

  // Enhanced request tracking to prevent duplicates
  const activeRequests = useRef<Set<string>>(new Set());
  const processedMessages = useRef<Set<string>>(new Set());
  
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
    if (setTools && setToolsActive) {
      setTools(hookTools || []);
      setToolsActive(hookToolsActive || false);
    }
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
    
    if (isLoading && currentSessionId && refreshMessages) {
      refreshInterval = setInterval(() => {
        refreshMessages();
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

  // Enhanced session loading on mount
  useEffect(() => {
    if (user && sessions.length === 0 && !isLoadingSessions && loadExistingSessions) {
      console.log('🔄 Loading sessions on mount');
      loadExistingSessions();
    }
  }, [user, sessions.length, loadExistingSessions, isLoadingSessions]);

  // Auto-start new session if none exists
  useEffect(() => {
    if (user && !currentSessionId && sessions.length === 0 && !isLoadingSessions && startNewSession) {
      console.log('🆕 Auto-starting new session');
      startNewSession();
    }
  }, [user, currentSessionId, sessions.length, startNewSession, isLoadingSessions]);

  // Clear processed messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      processedMessages.current.clear();
      console.log('🧹 Cleared processed messages for new session:', currentSessionId);
    }
  }, [currentSessionId]);

  // Handle session loading with new persistence hook
  const handleLoadSession = async (sessionId: string) => {
    if (!loadConversation) return;
    
    console.log(`📂 Loading session: ${sessionId}`);
    
    // Find session data from sessions list
    const sessionData = sessions.find(s => s.id === sessionId);
    if (sessionData && setCurrentSession) {
      setCurrentSession(sessionData);
    }

    // Clear processed messages for new session
    processedMessages.current.clear();
    
    // Load messages for this session
    await loadConversation(sessionId);
  };

  const handleFollowUpAction = async (action: string) => {
    if (!user || !currentSessionId) return;

    // Enhanced message ID generation with timestamp
    const messageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if we've already processed this exact action recently
    const actionKey = `${action}-${Date.now()}`;
    if (processedMessages.current.has(action)) {
      console.log('⚠️ Action already processed recently, skipping:', action);
      return;
    }
    processedMessages.current.add(action);
    
    const followUpMessage: ConversationMessage = {
      id: messageId,
      role: 'user',
      content: action,
      timestamp: new Date()
    };

    console.log(`📤 Processing follow-up action: ${messageId}`);
    
    if (persistMessage) {
      await persistMessage(followUpMessage);
    }
    if (setInput) {
      setInput('');
    }
    
    await processMessage(action, messageId);
  };

  const processMessage = async (message: string, existingMessageId?: string) => {
    if (!user || !currentSessionId) return;

    // Enhanced request tracking with message content hash
    const contentHash = btoa(message).substring(0, 16);
    const requestKey = `${currentSessionId}-${contentHash}-${existingMessageId || Date.now()}`;
    
    if (activeRequests.current.has(requestKey)) {
      console.log('⚠️ Request already in progress, skipping:', requestKey);
      return;
    }

    activeRequests.current.add(requestKey);
    if (setIsLoading) {
      setIsLoading(true);
    }
    clearTools();

    console.log(`🚀 Processing message: ${requestKey}`);

    try {
      const conversationHistory = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant').map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log(`📞 Calling AI agent with ${conversationHistory.length} history messages`);

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

      console.log('✅ AI agent response received:', { 
        streamedSteps: data.streamedSteps, 
        messageLength: data.message?.length 
      });

      // If streamedSteps flag is true, the backend has already inserted step messages
      if (data.streamedSteps) {
        console.log('🔄 Backend used streamedSteps, refreshing conversation');
        // Refresh conversation to show new messages
        setTimeout(() => {
          if (refreshMessages) {
            refreshMessages();
          }
        }, 2000);
      } else {
        // Fallback: add traditional single response message
        const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const assistantMessage: ConversationMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          messageType: 'response',
          toolsUsed: convertToolsUsed(data.toolsUsed) || [],
          loopIteration: data.loopIteration || 0,
          improvementReasoning: data.improvementReasoning || undefined
        };

        console.log(`💬 Adding assistant response: ${assistantMessageId}`);

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
      console.error('❌ Error sending message:', error);
      
      toast.error('Failed to send message', {
        description: error.message || 'Please try again.',
        duration: 10000
      });

      const errorMessageId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const errorMessage: ConversationMessage = {
        id: errorMessageId,
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      };

      if (persistMessage) {
        await persistMessage(errorMessage);
      }
    } finally {
      if (setIsLoading) {
        setIsLoading(false);
      }
      activeRequests.current.delete(requestKey);
      
      // Clean up processed messages after some time
      setTimeout(() => {
        processedMessages.current.clear();
      }, 30000); // Clear after 30 seconds
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user || !currentSessionId) return;

    // Enhanced message ID generation with better uniqueness
    const messageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check for rapid duplicate submissions
    const inputHash = btoa(input.trim()).substring(0, 16);
    if (processedMessages.current.has(inputHash)) {
      console.log('⚠️ Duplicate message detected, skipping:', input.substring(0, 50));
      return;
    }
    processedMessages.current.add(inputHash);

    const userMessage: ConversationMessage = {
      id: messageId,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    console.log(`📤 Sending user message: ${messageId}`);

    if (persistMessage) {
      await persistMessage(userMessage);
    }
    
    const messageToProcess = input;
    if (setInput) {
      setInput('');
    }
    
    await processMessage(messageToProcess, messageId);
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
