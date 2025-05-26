import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useAgentConversation, ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useToolProgress } from '@/hooks/useToolProgress';
import { useAIPhases } from '@/hooks/useAIPhases';
import { useConversationContext } from '@/hooks/useConversationContext';
import { useAIPlanDetector } from '@/hooks/useAIPlanDetector';
import { useDynamicPlanOrchestrator } from '@/hooks/useDynamicPlanOrchestrator';
import AIAgentHeader from './AIAgentHeader';
import AIAgentChatInterface from './AIAgentChatInterface';
import AIAgentInput from './AIAgentInput';
import SessionsSidebar from './SessionsSidebar';
import PlanExecutionProgress from './PlanExecutionProgress';

const AIAgentChat: React.FC = () => {
  const { user } = useAuth();
  const {
    currentSessionId,
    conversations,
    sessions,
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
  
  const { detectPlan } = useAIPlanDetector();
  const {
    currentPlan,
    isExecuting,
    createDynamicPlan,
    executeDynamicPlan,
    getProgress
  } = useDynamicPlanOrchestrator();

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
  }, [conversations]);

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
    
    setPhase('analyzing', 'AI is analyzing your request...', 10);
    
    const analysisMessage: ConversationMessage = {
      id: `analysis-${Date.now()}`,
      role: 'system',
      content: 'AI is determining the best approach for your request...',
      timestamp: new Date(),
      messageType: 'analysis'
    };
    
    addMessage(analysisMessage);
    
    setInput('');
    setIsLoading(true);
    clearTools();

    try {
      // Use AI to detect if we need a plan
      const planDetection = await detectPlan(enhancedMessage, getConversationHistory());
      
      console.log('AI Plan Detection Result:', planDetection);

      if (planDetection.shouldUsePlan && planDetection.suggestedSteps.length > 0) {
        // Create and execute dynamic plan
        setPhase('planning', 'Creating dynamic execution plan...', 5);
        
        const plan = await createDynamicPlan(
          enhancedMessage,
          planDetection.suggestedSteps,
          planDetection.planType
        );
        
        const planningMessage: ConversationMessage = {
          id: `planning-${Date.now()}`,
          role: 'system',
          content: `🤖 AI has created a ${planDetection.estimatedComplexity} plan: ${plan.title}\n\nSteps: ${planDetection.suggestedSteps.join(' → ')}`,
          timestamp: new Date(),
          messageType: 'planning',
          executionPlan: plan
        };
        addMessage(planningMessage);
        
        setPhase('executing', `Executing ${plan.steps.length} AI-generated steps...`, plan.steps.length * 8);

        // Execute the dynamic plan
        await executeDynamicPlan(
          plan,
          enhancedMessage,
          (step) => {
            console.log('AI Plan step updated:', step);
          },
          (result) => {
            const assistantMessage: ConversationMessage = {
              id: (Date.now() + 2).toString(),
              role: 'assistant',
              content: result,
              timestamp: new Date(),
              messageType: 'response',
              executionPlan: plan
            };
            addMessage(assistantMessage);
          }
        );

        setPhase('completed', 'AI plan execution completed');
        toast.success(`AI successfully completed ${plan.steps.length}-step plan`);
        
      } else {
        // Single-step execution for simple requests
        setPhase('executing', 'Processing your request...', 15);
        
        const conversationHistory = getConversationHistory();

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

        setPhase('completed', 'Done');

        const assistantMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          messageType: 'response',
          toolsUsed: data.toolsUsed || [],
          selfReflection: data.selfReflection
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
          />
        </CardHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentPlan && (
            <div className="px-6 pb-0">
              <PlanExecutionProgress plan={currentPlan} progress={getProgress()} />
            </div>
          )}
          
          <AIAgentChatInterface
            conversations={conversations}
            isLoading={isLoading}
            modelSettings={modelSettings}
            tools={tools}
            toolsActive={toolsActive}
            scrollAreaRef={scrollAreaRef}
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
