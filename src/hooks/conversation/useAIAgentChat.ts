
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useConversationContext } from '@/contexts/ConversationContext';
import { useMessageManager } from '@/hooks/conversation/useMessageManager';
import { useAgentManagement } from '@/hooks/useAgentManagement';
import { Agent } from '@/services/agentService';

export const useAIAgentChat = () => {
  const { user } = useAuth();
  const {
    messages,
    currentSessionId,
    isLoading,
    setIsLoading,
    input,
    setInput,
    addMessage,
    persistMessage,
    currentAgent,
    setCurrentAgent
  } = useConversationContext();

  const { ensureDefaultAgent } = useAgentManagement();
  const { generateMessageId } = useMessageManager();
  const [modelSettings, setModelSettings] = useState(getModelSettings());
  const [loopEnabled, setLoopEnabled] = useState(false);
  const activeRequests = useRef<Set<string>>(new Set());

  // Load loop preference from localStorage
  useEffect(() => {
    const savedLoopPreference = localStorage.getItem('aiAgentLoopEnabled');
    if (savedLoopPreference !== null) {
      setLoopEnabled(JSON.parse(savedLoopPreference));
    }
  }, []);

  // Ensure default agent exists on mount
  useEffect(() => {
    if (user && !currentAgent) {
      console.log('🤖 Ensuring default agent exists');
      ensureDefaultAgent().then(agent => {
        if (agent) {
          setCurrentAgent(agent);
          console.log('✅ Default agent loaded:', agent.name);
        }
      });
    }
  }, [user, currentAgent, ensureDefaultAgent, setCurrentAgent]);

  // Load model settings
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

  const handleToggleLoop = (enabled: boolean) => {
    setLoopEnabled(enabled);
    localStorage.setItem('aiAgentLoopEnabled', JSON.stringify(enabled));
  };

  const handleAgentChange = (agent: Agent) => {
    console.log('🔄 Agent change requested:', agent.name);
    console.log('🔍 Agent data being set:', {
      id: agent.id,
      name: agent.name,
      system_prompt: agent.system_prompt ? 'Has custom prompt' : 'No custom prompt',
      model: agent.model,
      loop_enabled: agent.loop_enabled
    });
    
    setCurrentAgent(agent);
    console.log('✅ Agent changed to:', agent.name);
    
    if (agent.loop_enabled !== undefined) {
      setLoopEnabled(agent.loop_enabled);
      localStorage.setItem('aiAgentLoopEnabled', JSON.stringify(agent.loop_enabled));
    }
  };

  const processMessage = async (message: string, existingMessageId?: string) => {
    if (!user || !currentSessionId) {
      console.error('❌ Cannot process message - missing user or session');
      return;
    }

    if (!currentAgent) {
      console.error('❌ Cannot process message - no current agent');
      toast.error('No agent selected. Please wait for the default agent to load.');
      return;
    }

    const requestKey = `${currentSessionId}-${Math.abs(message.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)).toString(36).substring(0, 8)}`;
    
    if (activeRequests.current.has(requestKey)) {
      console.log('⚠️ Request already in progress, skipping:', requestKey);
      return;
    }

    activeRequests.current.add(requestKey);
    setIsLoading(true);

    console.log(`🚀 Processing message: ${requestKey} with agent: ${currentAgent.name}`);

    try {
      const conversationHistory = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      console.log(`📞 Calling AI agent with ${conversationHistory.length} history messages, agent: ${currentAgent.name}, loop enabled: ${loopEnabled}`);

      const requestBody = {
        message,
        conversationHistory,
        userId: user.id,
        sessionId: currentSessionId,
        streaming: false,
        modelSettings: {
          ...modelSettings,
          selectedModel: currentAgent.model
        },
        loopEnabled: currentAgent.loop_enabled || loopEnabled,
        agentId: currentAgent.id,
        ...(currentAgent.system_prompt && { customSystemPrompt: currentAgent.system_prompt })
      };

      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: requestBody
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(error.message);
      }

      if (!data || !data.success) {
        console.error('❌ AI agent returned error:', data);
        throw new Error(data?.error || 'Failed to get response from AI agent');
      }

      console.log('✅ AI agent response received');

      // Handle regular response
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

        console.log(`🤖 Adding assistant response to context: ${assistantMessageId}`);
        
        addMessage(assistantMessage);
        const persistResult = await persistMessage(assistantMessage);
        console.log(`${persistResult ? '✅' : '❌'} Assistant message persistence ${persistResult ? 'succeeded' : 'failed'}`);
      }
      
      if (data.toolsUsed && data.toolsUsed.length > 0) {
        const successCount = data.toolsUsed.filter((tool: any) => tool.success).length;
        if (successCount > 0) {
          toast.success(`Used ${successCount} tool(s) successfully`);
        }
      }

    } catch (error) {
      console.error('❌ Error processing message:', error);
      
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

      addMessage(errorMessage);
      await persistMessage(errorMessage);
    } finally {
      setIsLoading(false);
      activeRequests.current.delete(requestKey);
    }
  };

  return {
    modelSettings,
    loopEnabled,
    handleToggleLoop,
    handleAgentChange,
    processMessage,
    currentAgent,
    currentPlan: null, // Removed orchestration plan state
    isOrchestrating: false // Removed orchestration state
  };
};
