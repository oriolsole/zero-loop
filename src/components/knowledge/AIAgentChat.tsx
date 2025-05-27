
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentConversation } from '@/hooks/useAgentConversation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import CollapsibleChatSidebar from './CollapsibleChatSidebar';
import SimplifiedChatInterface from './SimplifiedChatInterface';
import SimplifiedChatInput from './SimplifiedChatInput';
import SimplifiedChatHeader from './SimplifiedChatHeader';
import { ModelProvider } from '@/services/modelProviderService';
import { ToolProgressItem } from '@/types/tools';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';

const AIAgentChat: React.FC = () => {
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const {
    currentSessionId,
    conversations,
    sessions,
    isLoadingSessions,
    startNewSession,
    loadSession,
    loadSessions,
    deleteSession,
    addMessage,
    updateMessage,
    getConversationHistory
  } = useAgentConversation();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingSteps, setStreamingSteps] = useState<any[]>([]);
  const [workingStatus, setWorkingStatus] = useState('Processing your request...');
  const [currentTool, setCurrentTool] = useState<string | undefined>();
  const [toolProgress, setToolProgress] = useState<number | undefined>();
  const [tools, setTools] = useState<ToolProgressItem[]>([]);
  const [modelSettings] = useState({
    provider: 'openai' as ModelProvider,
    selectedModel: 'gpt-4o-mini'
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [conversations, streamingSteps, isLoading]);

  const handleSendMessage = async () => {
    if (!user || !currentSessionId || !input?.trim()) {
      if (!user) {
        toast.error('Please sign in to continue');
      }
      return;
    }

    const message = input.trim();
    setInput('');

    console.log('🚀 Sending message:', message);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingSteps([]);
    setWorkingStatus('Analyzing your request...');
    setCurrentTool(undefined);
    setToolProgress(undefined);
    setTools([]);

    // Add user message immediately
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    };

    await addMessage(userMessage);

    try {
      console.log('📡 Starting streaming request...');
      
      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message,
          conversationHistory: getConversationHistory(),
          userId: user.id,
          sessionId: currentSessionId,
          streaming: true,
          modelSettings
        }
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(error.message || 'Failed to get AI response');
      }

      // For streaming responses, we need to handle the response differently
      if (data) {
        console.log('✅ AI response received');
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant' as const,
          content: typeof data === 'string' ? data : data.message || 'No response received',
          timestamp: new Date(),
          toolsUsed: data.toolsUsed || []
        };

        await addMessage(assistantMessage);
      } else {
        throw new Error('No response received from AI agent');
      }

    } catch (error) {
      console.error('❌ Error in handleSendMessage:', error);
      toast.error(`Failed to get response: ${error.message}`);
      
      // Add error message to conversation
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant' as const,
        content: `I apologize, but I encountered an error while processing your request: ${error.message}. Please try again.`,
        timestamp: new Date()
      };

      await addMessage(errorMessage);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingSteps([]);
      setWorkingStatus('Processing your request...');
      setCurrentTool(undefined);
      setToolProgress(undefined);
    }
  };

  const handleFollowUpAction = async (action: string) => {
    setInput(action);
    await handleSendMessage();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please sign in to use the AI Agent.</p>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CollapsibleChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onStartNewSession={startNewSession}
          onLoadSession={loadSession}
          onDeleteSession={deleteSession}
          isLoading={isLoadingSessions}
        />
        
        <div className="flex-1 flex flex-col min-w-0">
          <SimplifiedChatHeader 
            modelSettings={modelSettings}
          />
          
          <SimplifiedChatInterface
            conversations={conversations}
            isLoading={isLoading}
            modelSettings={modelSettings}
            tools={tools}
            toolsActive={tools.length > 0}
            scrollAreaRef={scrollAreaRef}
            onFollowUpAction={handleFollowUpAction}
            streamingSteps={streamingSteps}
            isStreaming={isStreaming}
            workingStatus={workingStatus}
            currentTool={currentTool}
            toolProgress={toolProgress}
          />
          
          <SimplifiedChatInput
            input={input}
            onInputChange={setInput}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            modelProvider={modelSettings.provider}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AIAgentChat;
