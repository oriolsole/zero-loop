
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationContext } from '@/contexts/ConversationContext';
import { agentService, Agent } from '@/services/agentService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ModelProvider, ModelSettings } from '@/services/modelProviderService';

export const useAIAgentChat = () => {
  const { user, session } = useAuth();
  const { addMessage, currentSessionId, setIsLoading } = useConversationContext();
  
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    provider: 'npaw',
    selectedModel: 'gpt-4o'
  });
  const [loopEnabled, setLoopEnabled] = useState(false);

  // Load default agent on mount
  useEffect(() => {
    const loadDefaultAgent = async () => {
      if (!user) return;
      
      try {
        const agents = await agentService.getUserAgents();
        if (agents.length > 0) {
          setCurrentAgent(agents[0]);
          setLoopEnabled(agents[0].loop_enabled || false);
        }
      } catch (error) {
        console.error('Failed to load default agent:', error);
      }
    };

    loadDefaultAgent();
  }, [user]);

  const validateSession = useCallback(async () => {
    if (!session) {
      toast.error('Please log in to use AI features');
      return false;
    }

    // Check if session is still valid
    const { data: { user: currentUser }, error } = await supabase.auth.getUser();
    
    if (error || !currentUser) {
      toast.error('Your session has expired. Please log in again.');
      return false;
    }

    return true;
  }, [session]);

  const handleToggleLoop = useCallback(async (enabled: boolean) => {
    setLoopEnabled(enabled);
    
    if (currentAgent) {
      try {
        const updatedAgent = await agentService.updateAgent({
          id: currentAgent.id,
          loop_enabled: enabled
        });
        
        if (updatedAgent) {
          setCurrentAgent(updatedAgent);
        }
      } catch (error) {
        console.error('Failed to update agent loop setting:', error);
        toast.error('Failed to update loop setting');
      }
    }
  }, [currentAgent]);

  const handleAgentChange = useCallback((agent: Agent) => {
    setCurrentAgent(agent);
    setLoopEnabled(agent.loop_enabled || false);
  }, []);

  const processMessage = useCallback(async (message: string) => {
    if (!user || !currentSessionId) {
      toast.error('Please log in to send messages');
      return;
    }

    // Validate session before proceeding
    const isSessionValid = await validateSession();
    if (!isSessionValid) {
      return;
    }

    setIsLoading(true);

    try {
      // Get fresh session token
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        toast.error('Failed to get valid session. Please log in again.');
        setIsLoading(false);
        return;
      }

      console.log('🔑 Using fresh session token for AI agent call');

      // Add user message immediately with proper user data
      await addMessage({
        role: 'user',
        content: message,
        messageType: 'response',
        agent_id: currentAgent?.id || null
      });

      const response = await supabase.functions.invoke('ai-agent', {
        body: {
          message,
          userId: user.id,
          sessionId: currentSessionId,
          streaming: false,
          modelSettings,
          loopEnabled,
          agentId: currentAgent?.id || null,
          customSystemPrompt: currentAgent?.system_prompt || null
        },
        headers: {
          Authorization: `Bearer ${freshSession.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.error) {
        console.error('AI agent error:', response.error);
        
        // Check if it's an authentication error
        if (response.error.message?.includes('Invalid user token') || 
            response.error.message?.includes('JWT')) {
          toast.error('Session expired. Please refresh the page and log in again.');
        } else {
          toast.error(`AI Error: ${response.error.message}`);
        }
        return;
      }

      if (!response.data?.success) {
        console.error('AI agent failed:', response.data);
        toast.error('AI request failed. Please try again.');
        return;
      }

      console.log('✅ AI agent response received successfully');

    } catch (error: any) {
      console.error('Error in processMessage:', error);
      
      // Handle specific error types
      if (error.message?.includes('JWT') || error.message?.includes('auth')) {
        toast.error('Authentication error. Please refresh the page and log in again.');
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, currentSessionId, modelSettings, loopEnabled, currentAgent, addMessage, setIsLoading, validateSession]);

  return {
    currentAgent,
    modelSettings,
    loopEnabled,
    handleToggleLoop,
    handleAgentChange,
    processMessage
  };
};
