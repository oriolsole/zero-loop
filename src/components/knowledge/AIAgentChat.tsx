
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentConversation } from '@/hooks/useAgentConversation';
import SessionsSidebar from './SessionsSidebar';
import SimplifiedChatInterface from './SimplifiedChatInterface';
import SimplifiedChatInput from './SimplifiedChatInput';
import SimplifiedChatHeader from './SimplifiedChatHeader';
import { ModelProvider } from '@/services/modelProviderService';
import { ToolProgressItem } from '@/types/tools';
import { toast } from '@/components/ui/sonner';

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
    setInput(''); // Clear input immediately

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
      
      // Use Supabase edge function directly
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          message,
          conversationHistory: getConversationHistory(),
          userId: user.id,
          sessionId: currentSessionId,
          streaming: true,
          modelSettings
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      console.log('📥 Response received, processing stream...');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalMessage = '';
      let allToolsUsed: any[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Stream completed');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const step = JSON.parse(line);
                console.log('📦 Processing step:', step.type, step.content?.substring(0, 50) + '...');
                
                if (step.type === 'final-result') {
                  finalMessage = step.message;
                  allToolsUsed = step.toolsUsed || [];
                  console.log('🏁 Final result received:', finalMessage?.length, 'characters');
                } else if (step.type === 'error') {
                  throw new Error(step.error || 'Stream processing error');
                } else if (step.type === 'step-announcement') {
                  setWorkingStatus(step.content);
                  setStreamingSteps(prev => [...prev, step]);
                } else if (step.type === 'tool-announcement') {
                  setCurrentTool(step.toolName);
                  setToolProgress(25);
                  setWorkingStatus(`Using ${step.toolName}...`);
                  setStreamingSteps(prev => [...prev, step]);
                } else if (step.type === 'partial-result') {
                  setToolProgress(75);
                  setWorkingStatus('Processing results...');
                  setStreamingSteps(prev => [...prev, step]);
                } else {
                  setStreamingSteps(prev => [...prev, step]);
                }
              } catch (parseError) {
                console.error('❌ Error parsing stream chunk:', parseError, 'Raw line:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Add final assistant message
      if (finalMessage) {
        console.log('💾 Adding final message to conversation...');
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant' as const,
          content: finalMessage,
          timestamp: new Date(),
          toolsUsed: allToolsUsed
        };

        await addMessage(assistantMessage);
        console.log('✅ Final message added successfully');
      } else {
        console.warn('⚠️ No final message received from stream');
        toast.error('No response received from AI agent');
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
    <div className="flex h-full bg-background">
      <SessionsSidebar
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
  );
};

export default AIAgentChat;
