
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
  
  const { detectPlan } = useAIPlanDetector();
  const {
    createDynamicPlan,
    executeDynamicPlan
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

    try {
      // Use AI to detect if we need a plan
      const planDetection = await detectPlan(enhancedMessage, getConversationHistory());
      
      console.log('AI Plan Detection Result:', planDetection);

      if (planDetection.shouldUsePlan && planDetection.suggestedSteps.length > 0) {
        // AI explains it will create a plan
        const planMessage: ConversationMessage = {
          id: `plan-${Date.now()}`,
          role: 'assistant',
          content: `I'll help you with that by breaking this down into ${planDetection.suggestedSteps.length} steps. Let me work through this systematically.`,
          timestamp: new Date(),
          messageType: 'planning',
          aiReasoning: `Creating ${planDetection.estimatedComplexity} plan: ${planDetection.suggestedSteps.join(' → ')}`
        };
        addMessage(planMessage);
        
        // Create and execute dynamic plan with simple chat updates
        const plan = await createDynamicPlan(
          enhancedMessage,
          planDetection.suggestedSteps,
          planDetection.planType
        );

        // Execute the plan with conversational updates
        await executeDynamicPlan(
          plan,
          enhancedMessage,
          (step) => {
            // Add conversational step message
            const stepMessage: ConversationMessage = {
              id: `step-${step.id}-${Date.now()}`,
              role: 'assistant',
              content: step.aiInsight || `Working on: ${step.description}`,
              timestamp: new Date(),
              messageType: step.status === 'executing' ? 'step-executing' : 'step-completed',
              aiReasoning: step.reasoning,
              stepDetails: {
                tool: step.tool,
                result: step.extractedContent,
                status: step.status,
                progressUpdate: step.progressUpdate
              }
            };
            addMessage(stepMessage);
          },
          (result, followUpSuggestions) => {
            // Add final conversational result
            const finalMessage: ConversationMessage = {
              id: `final-${Date.now()}`,
              role: 'assistant',
              content: result,
              timestamp: new Date(),
              messageType: 'response',
              followUpSuggestions
            };
            addMessage(finalMessage);
          }
        );
        
      } else {
        // Single-step execution for simple requests
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
            currentPhase={currentPhase}
            phaseDetails={phaseDetails}
            estimatedTimeRemaining={estimatedTimeRemaining}
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
