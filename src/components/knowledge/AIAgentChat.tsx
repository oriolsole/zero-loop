
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useAgentConversation, ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useToolProgress } from '@/hooks/useToolProgress';
import { useConversationContext } from '@/hooks/useConversationContext';
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [workingMessage, setWorkingMessage] = useState<{
    step: string;
    tools: string[];
    progress: number;
  } | null>(null);

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
  }, [conversations, workingMessage]);

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

    const contextualMessage = getContextForMessage(message);
    const enhancedMessage = contextualMessage ? `${message}\n\nContext: ${contextualMessage}` : message;

    setIsLoading(true);
    setIsStreaming(true);
    clearTools();
    
    // Start with initial working message
    setWorkingMessage({
      step: "Processing your request...",
      tools: [],
      progress: 10
    });

    try {
      const conversationHistory = getConversationHistory();

      // Use streaming for enhanced experience
      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: enhancedMessage,
          conversationHistory,
          userId: user.id,
          sessionId: currentSessionId,
          streaming: true,
          modelSettings: modelSettings
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Handle streaming response
      if (data && typeof data === 'string') {
        const lines = data.split('\n').filter(line => line.trim());
        let finalResult: any = null;
        const usedTools: string[] = [];
        let currentProgress = 20;

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.type === 'final-result') {
              finalResult = parsed;
            } else {
              // Update working message based on stream type
              if (parsed.type === 'tool-announcement') {
                const toolName = parsed.toolName || 'unknown-tool';
                if (!usedTools.includes(toolName)) {
                  usedTools.push(toolName);
                }
                setWorkingMessage({
                  step: `Using ${toolName.replace(/-/g, ' ')}...`,
                  tools: usedTools,
                  progress: Math.min(currentProgress + 15, 80)
                });
                currentProgress = Math.min(currentProgress + 15, 80);
              } else if (parsed.type === 'step-announcement') {
                setWorkingMessage(prev => ({
                  step: parsed.content,
                  tools: prev?.tools || usedTools,
                  progress: Math.min(currentProgress + 10, 90)
                }));
                currentProgress = Math.min(currentProgress + 10, 90);
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse streaming chunk:', line);
          }
        }

        // Clear working message and add final response
        setWorkingMessage(null);

        if (finalResult && finalResult.success) {
          const assistantMessage: ConversationMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: finalResult.message,
            timestamp: new Date(),
            messageType: 'response',
            toolsUsed: finalResult.toolsUsed || [],
          };

          addMessage(assistantMessage);

          if (finalResult.toolsUsed && finalResult.toolsUsed.length > 0) {
            const successCount = finalResult.toolsUsed.filter((tool: any) => tool.success).length;
            if (successCount > 0) {
              toast.success(`Used ${successCount} tool(s) successfully`);
            }
          }
        }
      } else {
        // Fallback to non-streaming response
        setWorkingMessage(null);
        
        if (!data || !data.success) {
          throw new Error(data?.error || 'Failed to get response from AI agent');
        }

        const assistantMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          messageType: 'response',
          toolsUsed: data.toolsUsed || [],
          aiReasoning: data.aiReasoning || undefined
        };

        addMessage(assistantMessage);

        if (data.toolsUsed && data.toolsUsed.length > 0) {
          const successCount = data.toolsUsed.filter((tool: any) => tool.success).length;
          if (successCount > 0) {
            toast.success(`Used ${successCount} tool(s) successfully`);
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setWorkingMessage(null);
      
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
      setIsStreaming(false);
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
          workingMessage={workingMessage}
          isStreaming={isStreaming}
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
