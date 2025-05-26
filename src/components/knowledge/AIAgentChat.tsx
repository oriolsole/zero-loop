
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useAgentConversation, ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useToolProgress } from '@/hooks/useToolProgress';
import { EnhancedToolDecision } from './EnhancedToolDecision';
import { useEnhancedToolDecision } from '@/hooks/useEnhancedToolDecision';
import { useAIPhases } from '@/hooks/useAIPhases';
import { useConversationContext } from '@/hooks/useConversationContext';
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
    startNewSession,
    loadSession,
    addMessage,
    getConversationHistory,
    deleteSession
  } = useAgentConversation();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [modelSettings, setModelSettings] = useState(getModelSettings());
  
  const {
    toolDecision,
    currentStep,
    isExecuting,
    analyzeRequest,
    startExecution,
    nextStep,
    completeExecution,
    resetDecision
  } = useEnhancedToolDecision();

  const {
    currentPhase,
    phaseDetails,
    estimatedTimeRemaining,
    setPhase,
    resetPhases
  } = useAIPhases();
  
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

  // Helper function to normalize toolDecision data
  const normalizeToolDecision = (toolDecision: any): EnhancedToolDecision => {
    return {
      shouldUseTools: toolDecision.shouldUseTools || false,
      detectedType: toolDecision.detectedType || 'general',
      reasoning: toolDecision.reasoning || 'No reasoning provided',
      confidence: toolDecision.confidence || 0.5,
      suggestedTools: toolDecision.suggestedTools || [],
      complexity: toolDecision.complexity || 'simple',
      estimatedSteps: toolDecision.estimatedSteps || 1,
      fallbackStrategy: toolDecision.fallbackStrategy
    };
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user || !currentSessionId) return;

    const contextualMessage = getContextForMessage(input);
    const enhancedMessage = contextualMessage ? `${input}\n\nContext: ${contextualMessage}` : input;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    addMessage(userMessage);
    
    setPhase('analyzing', 'Understanding your request...', 15);
    const decision = analyzeRequest(enhancedMessage);
    
    setInput('');
    setIsLoading(true);
    clearTools();

    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setPhase('error', 'Request timed out');
        resetDecision();
        resetPhases();
        toast.error('Request timed out');
        
        const timeoutMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I apologize, but my response timed out. Please try your request again.',
          timestamp: new Date()
        };
        addMessage(timeoutMessage);
      }
    }, 60000);

    try {
      const conversationHistory = getConversationHistory();

      setPhase('planning', 'Processing your request...', 10);
      if (decision.shouldUseTools) {
        startExecution();
        setPhase('executing', `Using ${decision.suggestedTools.length} tools...`, decision.estimatedSteps * 3);
      }

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

      clearTimeout(timeoutId);

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to get response from AI agent');
      }

      setPhase('reflecting', 'Finalizing response...', 5);

      // Process and store tool results
      if (data.toolProgress && data.toolProgress.length > 0) {
        data.toolProgress.forEach((toolItem: any) => {
          nextStep();
          
          const toolId = startTool(
            toolItem.name || 'unknown-tool',
            toolItem.name?.replace('execute_', '') || 'Unknown Tool',
            toolItem.parameters
          );

          updateTool(toolId, {
            status: toolItem.status,
            endTime: toolItem.endTime,
            result: toolItem.result,
            error: toolItem.error,
            progress: toolItem.status === 'completed' ? 100 : toolItem.status === 'failed' ? 0 : 50
          });

          if (toolItem.result) {
            storeToolResult(toolId, toolItem.result);
          }
        });
      }

      // Update context based on tool results
      if (data.toolsUsed) {
        data.toolsUsed.forEach((tool: any) => {
          if (tool.name.includes('github') && tool.result?.url) {
            const urlParts = tool.result.url.split('/');
            if (urlParts.length >= 5) {
              updateGitHubContext({
                owner: urlParts[3],
                repo: urlParts[4],
                url: tool.result.url
              });
            }
          }
          
          if (tool.name.includes('search') && tool.result) {
            updateSearchContext(input, tool.result);
          }
        });
      }

      completeExecution();
      setPhase('completed', 'Done');

      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        toolsUsed: data.toolsUsed || [],
        selfReflection: data.selfReflection,
        toolDecision: data.toolDecision
      };

      addMessage(assistantMessage);

      if (data.toolsUsed && data.toolsUsed.length > 0) {
        const successCount = data.toolsUsed.filter((tool: any) => tool.success).length;
        if (successCount > 0) {
          const successfulTools = data.toolsUsed
            .filter((tool: any) => tool.success)
            .map((tool: any) => tool.name.replace('execute_', ''))
            .join(', ');
          
          toast.success(`Used ${successCount} tool(s): ${successfulTools}`);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      clearTimeout(timeoutId);
      setPhase('error', `Error: ${error.message}`);
      
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
      setTimeout(() => {
        resetDecision();
        resetPhases();
      }, 3000);
    }
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
            currentPhase={currentPhase}
            phaseDetails={phaseDetails}
            estimatedTimeRemaining={estimatedTimeRemaining}
            toolDecision={toolDecision}
            isExecuting={isExecuting}
            currentStep={currentStep}
            normalizeToolDecision={normalizeToolDecision}
          />
        </CardHeader>
        
        <AIAgentChatInterface
          conversations={conversations}
          isLoading={isLoading}
          modelSettings={modelSettings}
          tools={tools}
          toolsActive={toolsActive}
          normalizeToolDecision={normalizeToolDecision}
          scrollAreaRef={scrollAreaRef}
        />
        
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
