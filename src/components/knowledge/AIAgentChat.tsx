
import React, { useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useToolProgress } from '@/hooks/useToolProgress';
import { useConversationContext } from '@/contexts/ConversationContext';
import { useMessageManager } from '@/hooks/conversation/useMessageManager';
import { useSessionManager } from '@/hooks/conversation/useSessionManager';
import SimplifiedChatInterface from './SimplifiedChatInterface';
import SimplifiedChatInput from './SimplifiedChatInput';
import SimplifiedChatHeader from './SimplifiedChatHeader';
import SessionsSidebar from './SessionsSidebar';

const AIAgentChat: React.FC = () => {
  const { user } = useAuth();

  // Use context for centralized state management
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
    setCurrentSession,
    addMessageToContext,
    persistMessage,
    loadConversation,
    addAssistantResponse
  } = useConversationContext();

  // Use session manager for session operations
  const { 
    sessions,
    isLoadingSessions,
    loadExistingSessions,
    startNewSession,
    deleteSession
  } = useSessionManager();

  const { generateMessageId } = useMessageManager();
  const [showSessions, setShowSessions] = React.useState(false);
  const [modelSettings, setModelSettings] = React.useState(getModelSettings());

  // Request tracking to prevent duplicates
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
    setTools(hookTools || []);
    setToolsActive(hookToolsActive || false);
  }, [hookTools, hookToolsActive, setTools, setToolsActive]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, tools]);

  // Load model settings on component mount
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
      console.log('🔄 Loading sessions on mount');
      loadExistingSessions();
    }
  }, [user, sessions.length, loadExistingSessions, isLoadingSessions]);

  // Auto-start new session if none exists
  useEffect(() => {
    if (user && !currentSessionId && sessions.length === 0 && !isLoadingSessions) {
      console.log('🆕 Auto-starting new session');
      startNewSession();
    }
  }, [user, currentSessionId, sessions.length, startNewSession, isLoadingSessions]);

  // Handle session loading
  const handleLoadSession = async (sessionId: string) => {
    console.log(`📂 Loading session: ${sessionId}`);
    
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

    const messageId = generateMessageId(action, 'user', currentSessionId);
    
    const followUpMessage: ConversationMessage = {
      id: messageId,
      role: 'user',
      content: action,
      timestamp: new Date()
    };

    console.log(`📤 Processing follow-up action: ${messageId}`);
    
    // Add to context immediately for UX
    addMessageToContext(followUpMessage);
    
    // Persist to database
    await persistMessage(followUpMessage);
    
    setInput('');
    await processMessage(action, messageId);
  };

  const processMessage = async (message: string, existingMessageId?: string) => {
    if (!user || !currentSessionId) return;

    const requestKey = `${currentSessionId}-${btoa(message).substring(0, 16)}`;
    
    if (activeRequests.current.has(requestKey)) {
      console.log('⚠️ Request already in progress, skipping:', requestKey);
      return;
    }

    activeRequests.current.add(requestKey);
    setIsLoading(true);
    clearTools();

    console.log(`🚀 Processing message: ${requestKey}`);

    try {
      const conversationHistory = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
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

      console.log('✅ AI agent response received:', data);

      // CRITICAL: Create and add assistant response to context IMMEDIATELY
      if (data.response) {
        const assistantMessageId = generateMessageId(data.response, 'assistant', currentSessionId);
        
        const assistantMessage: ConversationMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          messageType: 'response',
          loopIteration: data.loopIteration || 0,
          toolsUsed: data.toolsUsed || undefined,
          improvementReasoning: data.improvementReasoning || undefined
        };

        console.log(`🤖 Adding assistant response to UI immediately: ${assistantMessageId}`);
        // Add to UI context first for immediate display
        addAssistantResponse(assistantMessage);

        // Then persist to database (this will trigger real-time for other clients)
        await persistMessage(assistantMessage);
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

      const errorMessageId = generateMessageId(`Error: ${error.message}`, 'assistant', currentSessionId);
      
      const errorMessage: ConversationMessage = {
        id: errorMessageId,
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      };

      addAssistantResponse(errorMessage);
      await persistMessage(errorMessage);
    } finally {
      setIsLoading(false);
      activeRequests.current.delete(requestKey);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user || !currentSessionId) return;

    const messageId = generateMessageId(input, 'user', currentSessionId);

    const userMessage: ConversationMessage = {
      id: messageId,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    console.log(`📤 Sending user message: ${messageId}`);

    // Add to context immediately for UX
    addMessageToContext(userMessage);
    
    // Persist to database
    await persistMessage(userMessage);
    
    const messageToProcess = input;
    setInput('');
    
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
