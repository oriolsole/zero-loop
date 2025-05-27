
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useAgentConversation, ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useToolProgress } from '@/hooks/useToolProgress';
import { useConversationContext } from '@/hooks/useConversationContext';
import { KnowledgeToolResult } from '@/types/tools';
import AIAgentHeader from './AIAgentHeader';
import AIAgentChatInterface from './AIAgentChatInterface';
import AIAgentInput from './AIAgentInput';
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

  const {
    context,
    updateGitHubContext,
    updateSearchContext,
    storeToolResult,
    getContextForMessage
  } = useConversationContext();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversations, tools]);

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

  const addStatusMessage = (content: string, type: 'thinking' | 'success' | 'error' = 'thinking') => {
    const statusMessage: ConversationMessage = {
      id: `status-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      messageType: 'status' as any
    };
    addMessage(statusMessage);
    return statusMessage.id;
  };

  const removeStatusMessage = (messageId: string) => {
    // In a real implementation, you'd want to remove the message from the conversations array
    // For now, we'll just replace it with a completion indicator
    updateMessage(messageId, { 
      content: '✓ Processing complete',
      messageType: 'status' as any
    });
  };

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

    const contextualMessage = getContextForMessage(message);
    const enhancedMessage = contextualMessage ? `${message}\n\nContext: ${contextualMessage}` : message;

    setIsLoading(true);
    clearTools();

    // Add progressive status messages
    const statusId = addStatusMessage("Analyzing your request...");

    try {
      const conversationHistory = getConversationHistory();

      // Update status message
      setTimeout(() => {
        updateMessage(statusId, { content: "Determining complexity and tool requirements..." });
      }, 800);

      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: enhancedMessage,
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

      // Remove status message and add final response
      removeStatusMessage(statusId);

      // Transform knowledge persistence data into learning insights format
      let learningInsights: KnowledgeToolResult[] = [];
      if (data.knowledgePersistence && data.knowledgePersistence.success) {
        learningInsights = [{
          name: 'learning_generation',
          parameters: {
            query: message,
            complexity: data.complexity || 'COMPLEX'
          },
          result: {
            nodeId: data.knowledgePersistence.nodeId,
            insight: data.knowledgePersistence.insight,
            complexity: data.complexity || 'COMPLEX',
            iterations: data.iterations || 1,
            persistenceStatus: 'persisted' as const,
            message: 'Learning insight generated and persisted successfully'
          },
          success: true
        }];
      }

      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        messageType: 'response',
        toolsUsed: data.toolsUsed || [],
        learningInsights: learningInsights,
        aiReasoning: data.aiReasoning || undefined
      };

      addMessage(assistantMessage);

      if (data.toolsUsed && data.toolsUsed.length > 0) {
        const successCount = data.toolsUsed.filter((tool: any) => tool.success).length;
        if (successCount > 0) {
          toast.success(`Used ${successCount} tool(s) successfully`);
        }
      }

      if (learningInsights.length > 0) {
        toast.success('Learning insight generated and persisted');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      updateMessage(statusId, { 
        content: `❌ Error: ${error.message}`,
        messageType: 'status' as any
      });

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
    <div className="flex h-[700px] gap-4">
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

      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <AIAgentHeader
            modelSettings={modelSettings}
            showSessions={showSessions}
            onToggleSessions={() => setShowSessions(!showSessions)}
            onNewSession={startNewSession}
            isLoading={isLoading}
          />
        </CardHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <AIAgentChatInterface
            conversations={conversations}
            isLoading={isLoading}
            modelSettings={modelSettings}
            tools={tools}
            toolsActive={toolsActive}
            scrollAreaRef={scrollAreaRef}
            onFollowUpAction={handleFollowUpAction}
          />
        </div>
        
        <AIAgentInput
          input={input}
          onInputChange={setInput}
          onSendMessage={sendMessage}
          isLoading={isLoading}
          modelProvider={modelSettings.provider}
        />
      </Card>
    </div>
  );
};

export default AIAgentChat;
