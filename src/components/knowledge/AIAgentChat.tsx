import React, { useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useConversationContext } from '@/contexts/ConversationContext';
import { useMessageManager } from '@/hooks/conversation/useMessageManager';
import { useSessionManager } from '@/hooks/conversation/useSessionManager';
import SimplifiedChatInterface from './SimplifiedChatInterface';
import SimplifiedChatInput from './SimplifiedChatInput';
import SimplifiedChatHeader from './SimplifiedChatHeader';
import SessionsSidebar from './SessionsSidebar';
import ToolProgressManager from './ToolProgressManager';

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
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Handle tool progress updates from ToolProgressManager
  const handleToolsUpdate = React.useCallback((updatedTools: any[], isActive: boolean) => {
    setTools(updatedTools);
    setToolsActive(isActive);
  }, [setTools, setToolsActive]);

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
    if (!user || !currentSessionId) {
      console.error('❌ [PROCESS] Cannot process message - missing user or session');
      return;
    }

    const requestKey = `${currentSessionId}-${btoa(message).substring(0, 16)}`;
    
    if (activeRequests.current.has(requestKey)) {
      console.log('⚠️ [PROCESS] Request already in progress, skipping:', requestKey);
      return;
    }

    activeRequests.current.add(requestKey);
    setIsLoading(true);

    console.log(`🚀 [PROCESS] Processing message: ${requestKey}`);
    console.log(`📝 [PROCESS] Current session: ${currentSessionId}`);
    console.log(`👤 [PROCESS] User ID: ${user.id}`);

    try {
      const conversationHistory = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      console.log(`📞 [PROCESS] Calling AI agent with ${conversationHistory.length} history messages`);

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
        console.error('❌ [PROCESS] Supabase function error:', error);
        throw new Error(error.message);
      }

      if (!data || !data.success) {
        console.error('❌ [PROCESS] AI agent returned error:', data);
        throw new Error(data?.error || 'Failed to get response from AI agent');
      }

      console.log('✅ [PROCESS] AI agent response received:', {
        success: data.success,
        messageLength: data.message?.length,
        responseLength: data.response?.length,
        loopIteration: data.loopIteration,
        toolsUsed: data.toolsUsed?.length
      });

      // CRITICAL FIX: Check for both 'message' and 'response' fields from backend
      const aiResponse = data.message || data.response;
      
      if (aiResponse) {
        const assistantMessageId = generateMessageId(aiResponse, 'assistant', currentSessionId);
        
        const assistantMessage: ConversationMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
          messageType: 'response',
          loopIteration: data.loopIteration || 0,
          toolsUsed: data.toolsUsed || undefined,
          improvementReasoning: data.improvementReasoning || undefined
        };

        console.log(`🤖 [PROCESS] Creating assistant message for immediate UI display: ${assistantMessageId}`);
        console.log(`📝 [PROCESS] Assistant message content preview: "${aiResponse.substring(0, 100)}..."`);
        
        // Add to UI context first for immediate display
        console.log(`➕ [PROCESS] Adding assistant response to context...`);
        addAssistantResponse(assistantMessage);
        console.log(`✅ [PROCESS] Assistant response added to context successfully`);

        // Then persist to database (this will trigger real-time for other clients)
        console.log(`💾 [PROCESS] Persisting assistant message to database...`);
        const persistResult = await persistMessage(assistantMessage);
        console.log(`${persistResult ? '✅' : '❌'} [PROCESS] Assistant message persistence ${persistResult ? 'succeeded' : 'failed'}`);
      } else {
        console.warn('⚠️ [PROCESS] No response content in AI agent data:', { 
          hasMessage: !!data.message, 
          hasResponse: !!data.response,
          dataKeys: Object.keys(data)
        });
      }
      
      if (data.toolsUsed && data.toolsUsed.length > 0) {
        const successCount = data.toolsUsed.filter((tool: any) => tool.success).length;
        if (successCount > 0) {
          toast.success(`Used ${successCount} tool(s) successfully`);
        }
      }

    } catch (error) {
      console.error('❌ [PROCESS] Error processing message:', error);
      
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

      console.log(`🚨 [PROCESS] Adding error message to context: ${errorMessageId}`);
      addAssistantResponse(errorMessage);
      await persistMessage(errorMessage);
    } finally {
      setIsLoading(false);
      activeRequests.current.delete(requestKey);
      console.log(`🏁 [PROCESS] Message processing completed for: ${requestKey}`);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user || !currentSessionId) {
      console.log('⚠️ [SEND] Cannot send message - invalid state:', {
        hasInput: !!input.trim(),
        isLoading,
        hasUser: !!user,
        hasSession: !!currentSessionId
      });
      return;
    }

    const messageId = generateMessageId(input, 'user', currentSessionId);

    const userMessage: ConversationMessage = {
      id: messageId,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    console.log(`📤 [SEND] Sending user message: ${messageId} - "${input}"`);

    // Add to context immediately for UX
    addMessageToContext(userMessage);
    
    // Persist to database
    await persistMessage(userMessage);
    
    const messageToProcess = input;
    setInput('');
    
    await processMessage(messageToProcess, messageId);
  };

  // Debug effect to monitor messages state
  useEffect(() => {
    console.log(`🎯 [CHAT] Messages state updated. Count: ${messages.length}`);
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log(`📨 [CHAT] Last message: ${lastMessage.id.substring(0, 8)} (${lastMessage.role}) - "${lastMessage.content.substring(0, 50)}..."`);
    }
  }, [messages]);

  return (
    <div className="flex h-full">
      {/* Tool Progress Manager - handles tool state automatically */}
      <ToolProgressManager onToolsUpdate={handleToolsUpdate} />
      
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
