import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useAgentConversation, ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useToolProgress } from '@/hooks/useToolProgress';
import { useEnhancedToolDecision } from '@/hooks/useEnhancedToolDecision';
import { useAIPhases } from '@/hooks/useAIPhases';
import { useConversationContext } from '@/hooks/useConversationContext';
import { usePlanOrchestrator } from '@/hooks/usePlanOrchestrator';
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
  
  const {
    toolDecision,
    currentStep,
    isExecuting,
    currentPlan,
    planProgress,
    analyzeRequest,
    startExecution,
    nextStep,
    completeExecution,
    resetDecision,
    onStepUpdate,
    onPlanComplete
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

  const { createPlan, executePlan } = usePlanOrchestrator();
  
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
    
    setPhase('analyzing', 'Understanding your request...', 15);
    const decision = analyzeRequest(enhancedMessage, getConversationHistory());
    
    const analysisMessage: ConversationMessage = {
      id: `analysis-${Date.now()}`,
      role: 'system',
      content: `I'm analyzing your request... ${decision.reasoning}`,
      timestamp: new Date(),
      messageType: 'analysis',
      toolDecision: decision
    };
    
    addMessage(analysisMessage);
    
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
    }, 120000); // Extended timeout for multi-step plans

    try {
      const conversationHistory = getConversationHistory();

      // Check if we should use multi-step planning
      if (decision.detectedType === 'multi-step-plan' && decision.planType) {
        console.log('Executing multi-step plan:', decision.planType);
        
        const plan = createPlan(decision.planType, enhancedMessage, decision.planContext);
        
        const planningMessage: ConversationMessage = {
          id: `planning-${Date.now()}`,
          role: 'system',
          content: `I'll execute a comprehensive plan: ${plan.title}`,
          timestamp: new Date(),
          messageType: 'planning',
          executionPlan: plan
        };
        addMessage(planningMessage);
        
        startExecution();
        setPhase('executing', `Executing ${plan.steps.length} steps...`, plan.totalEstimatedTime);

        // Execute the plan
        await executePlan(plan, onStepUpdate, (result) => {
          const assistantMessage: ConversationMessage = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: result,
            timestamp: new Date(),
            messageType: 'response',
            executionPlan: plan
          };
          addMessage(assistantMessage);
          onPlanComplete(result);
        });

        clearTimeout(timeoutId);
        setPhase('completed', 'Plan execution completed');
        toast.success(`Successfully completed ${plan.steps.length}-step plan`);
        
      } else {
        // Single-step execution (existing logic)
        if (decision.shouldUseTools && decision.suggestedTools.length > 0) {
          const planningMessage: ConversationMessage = {
            id: `planning-${Date.now()}`,
            role: 'system',
            content: `I'll use these tools to help you: ${decision.suggestedTools.map(tool => tool.replace('execute_', '')).join(', ')}`,
            timestamp: new Date(),
            messageType: 'planning'
          };
          addMessage(planningMessage);
          
          startExecution();
          setPhase('executing', `Using ${decision.suggestedTools.length} tools...`, decision.estimatedSteps * 3);
        } else {
          setPhase('planning', 'Processing your request...', 10);
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

        // Add tool execution messages if tools were used
        if (data.toolProgress && data.toolProgress.length > 0) {
          const executionMessage: ConversationMessage = {
            id: `execution-${Date.now()}`,
            role: 'system',
            content: 'Executing tools...',
            timestamp: new Date(),
            messageType: 'execution',
            toolProgress: data.toolProgress,
            isStreaming: false
          };
          addMessage(executionMessage);

          // Process tool results
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

        // Add final response message
        const assistantMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          messageType: 'response',
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
          />
        </CardHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentPlan && (
            <div className="px-6 pb-0">
              <PlanExecutionProgress plan={currentPlan} progress={planProgress} />
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
