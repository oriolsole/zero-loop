
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

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    addMessage(userMessage);
    
    setPhase('analyzing', 'Analyzing your request and determining the best approach...', 15);
    const decision = analyzeRequest(input);
    
    setInput('');
    setIsLoading(true);
    clearTools();

    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setPhase('error', 'Request timed out');
        resetDecision();
        resetPhases();
        toast.error('Request timed out', {
          description: 'The AI agent took too long to respond. Please try again.'
        });
        
        const timeoutMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I apologize, but my response timed out. Please try your request again. If this continues to happen, there might be an issue with the AI service.',
          timestamp: new Date()
        };
        addMessage(timeoutMessage);
      }
    }, 60000);

    try {
      const conversationHistory = getConversationHistory();

      console.log('Sending message to AI agent with enhanced analysis:', {
        message: input,
        conversationHistory: conversationHistory.length,
        userId: user.id,
        sessionId: currentSessionId,
        modelSettings,
        toolDecision: decision
      });

      setPhase('planning', 'Creating execution strategy...', 10);
      if (decision.shouldUseTools) {
        startExecution();
        setPhase('executing', `Executing ${decision.suggestedTools.length} tools...`, decision.estimatedSteps * 3);
      }

      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: input,
          conversationHistory,
          userId: user.id,
          sessionId: currentSessionId,
          streaming: false,
          modelSettings: modelSettings
        }
      });

      clearTimeout(timeoutId);

      console.log('AI agent response:', { data, error });

      if (error) {
        console.error('AI agent error:', error);
        throw new Error(error.message);
      }

      if (!data || !data.success) {
        console.error('AI agent returned error:', data?.error);
        throw new Error(data?.error || 'Failed to get response from AI agent');
      }

      setPhase('reflecting', 'Processing results and preparing response...', 5);

      if (data.toolDecision && data.toolDecision.complexity) {
        console.log('Enhanced tool decision received:', data.toolDecision);
      }

      if (data.toolProgress && data.toolProgress.length > 0) {
        console.log('Processing tool progress:', data.toolProgress);
        
        data.toolProgress.forEach((toolItem: any, index: number) => {
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
        });
      }

      if (data.toolsUsed && data.toolsUsed.length > 0 && (!data.toolProgress || data.toolProgress.length === 0)) {
        console.log('Processing legacy tools used:', data.toolsUsed);
        
        data.toolsUsed.forEach((tool: any, index: number) => {
          nextStep();
          
          const toolId = startTool(
            tool.name,
            tool.name.replace('execute_', ''),
            tool.parameters
          );

          setTimeout(() => {
            if (tool.success) {
              completeTool(toolId, tool.result);
            } else {
              failTool(toolId, tool.result?.error || 'Tool execution failed');
            }
          }, (index + 1) * 200);
        });
      }

      completeExecution();
      setPhase('completed', 'Response ready');

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
        const failCount = data.toolsUsed.length - successCount;
        
        console.log('Enhanced tool execution summary:', { 
          total: data.toolsUsed.length, 
          success: successCount, 
          failed: failCount,
          expectedComplexity: decision.complexity,
          actualSteps: data.toolsUsed.length,
          expectedSteps: decision.estimatedSteps
        });
        
        if (successCount > 0) {
          const successfulTools = data.toolsUsed
            .filter((tool: any) => tool.success)
            .map((tool: any) => tool.name.replace('execute_', ''))
            .join(', ');
          
          toast.success(`Successfully executed ${successCount} tool(s)`, {
            description: `Tools: ${successfulTools}`
          });
        }
        
        if (failCount > 0) {
          const failedTools = data.toolsUsed
            .filter((tool: any) => !tool.success)
            .map((tool: any) => `${tool.name.replace('execute_', '')}: ${tool.result?.error || 'Unknown error'}`)
            .join(', ');
          
          toast.error(`${failCount} tool(s) failed`, {
            description: `${failedTools}. ${decision.fallbackStrategy || 'Please try rephrasing your request.'}`,
            duration: 10000
          });
        }
      } else {
        console.log('No tools were used in this response');
      }

      if (data.fallbackUsed) {
        toast.warning(`Using OpenAI fallback`, {
          description: `${modelSettings.provider.toUpperCase()} failed: ${data.fallbackReason}`
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      clearTimeout(timeoutId);
      setPhase('error', `Error: ${error.message}`);
      
      toast.error('Failed to send message', {
        description: error.message || 'Please try again. Check edge function logs if the issue persists.',
        duration: 10000
      });

      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error processing your request: ${error.message}. 

This could be due to:
- Network connectivity issues
- AI service temporarily unavailable
- Configuration problems with API keys

Please try again, or check the edge function logs in the Supabase dashboard if you're the administrator.`,
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
