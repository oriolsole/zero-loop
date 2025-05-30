
import React, { useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useConversationContext } from '@/contexts/ConversationContext';
import { useMessageManager } from '@/hooks/conversation/useMessageManager';
import { useSessionManager } from '@/hooks/conversation/useSessionManager';
import { useSystemPrompt } from '@/hooks/useSystemPrompt';
import SimplifiedChatInterface from './SimplifiedChatInterface';
import SimplifiedChatInput from './SimplifiedChatInput';
import SimplifiedChatHeader from './SimplifiedChatHeader';
import SessionsSidebar from './SessionsSidebar';
import SystemPromptEditor from './SystemPromptEditor';

const AIAgentChat: React.FC = () => {
  const { user } = useAuth();

  // Use simplified context
  const {
    messages,
    currentSessionId,
    isLoading,
    setIsLoading,
    input,
    setInput,
    activeTool,
    setCurrentSession,
    addMessage,
    persistMessage,
    loadConversation
  } = useConversationContext();

  const { 
    sessions,
    isLoadingSessions,
    loadExistingSessions,
    startNewSession,
    deleteSession
  } = useSessionManager();

  const { generateMessageId } = useMessageManager();
  const [showSessions, setShowSessions] = React.useState(false);
  const [modelSettings, setModelSettings] = React.useState(getModelSettings());
  const [loopEnabled, setLoopEnabled] = React.useState(false); // Default to disabled
  const [showPromptEditor, setShowPromptEditor] = React.useState(false);

  // System prompt management
  const {
    customPrompt,
    useCustomPrompt,
    setCustomPrompt,
    setUseCustomPrompt,
    resetToDefault
  } = useSystemPrompt();

  const activeRequests = useRef<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load loop preference from localStorage
  useEffect(() => {
    const savedLoopPreference = localStorage.getItem('aiAgentLoopEnabled');
    if (savedLoopPreference !== null) {
      setLoopEnabled(JSON.parse(savedLoopPreference));
    }
  }, []);

  // Save loop preference to localStorage
  const handleToggleLoop = (enabled: boolean) => {
    setLoopEnabled(enabled);
    localStorage.setItem('aiAgentLoopEnabled', JSON.stringify(enabled));
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, activeTool]);

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

  // Load sessions on mount
  useEffect(() => {
    if (user && sessions.length === 0 && !isLoadingSessions) {
      console.log('🔄 Loading sessions on mount');
      loadExistingSessions();
    }
  }, [user, sessions.length, loadExistingSessions, isLoadingSessions]);

  // Auto-start new session if none exists
  useEffect(() => {
    if (user && !currentSessionId && sessions.length === 0 && !isLoadingSessions) {
      console.log('🆕 Auto-starting new session');
      startNewSession();
    }
  }, [user, currentSessionId, sessions.length, startNewSession, isLoadingSessions]);

  // Handle session loading
  const handleLoadSession = async (sessionId: string) => {
    console.log(`📂 Loading session: ${sessionId}`);
    
    const sessionData = sessions.find(s => s.id === sessionId);
    if (sessionData) {
      setCurrentSession(sessionData);
    }

    await loadConversation(sessionId);
  };

  const handleFollowUpAction = async (action: string) => {
    if (!user || !currentSessionId) return;

    const messageId = generateMessageId(action, 'user', currentSessionId);
    
    const followUpMessage: ConversationMessage = {
      id: messageId,
      role: 'user',
      content: action,
      timestamp: new Date()
    };

    console.log(`📤 Processing follow-up action: ${messageId}`);
    
    // Add to context immediately
    addMessage(followUpMessage);
    
    // Persist to database
    await persistMessage(followUpMessage);
    
    setInput('');
    await processMessage(action, messageId);
  };

  const processMessage = async (message: string, existingMessageId?: string) => {
    if (!user || !currentSessionId) {
      console.error('❌ Cannot process message - missing user or session');
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

    console.log(`🚀 Processing message: ${requestKey}`);

    try {
      const conversationHistory = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      console.log(`📞 Calling AI agent with ${conversationHistory.length} history messages, loop enabled: ${loopEnabled}`);

      // Prepare the request body with custom prompt if enabled
      const requestBody: {
        message: string;
        conversationHistory: { role: "user" | "assistant"; content: string; }[];
        userId: string;
        sessionId: string;
        streaming: boolean;
        modelSettings: typeof modelSettings;
        loopEnabled: boolean;
        customSystemPrompt?: string;
      } = {
        message,
        conversationHistory,
        userId: user.id,
        sessionId: currentSessionId,
        streaming: false,
        modelSettings: modelSettings,
        loopEnabled: loopEnabled
      };

      // Add custom prompt if user has enabled it and provided one
      if (useCustomPrompt && customPrompt.trim()) {
        requestBody.customSystemPrompt = customPrompt;
      }

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
        
        // Add to context immediately
        addMessage(assistantMessage);

        // Persist to database
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

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user || !currentSessionId) {
      return;
    }

    const messageId = generateMessageId(input, 'user', currentSessionId);

    const userMessage: ConversationMessage = {
      id: messageId,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    console.log(`📤 Sending user message: ${messageId}`);

    // Add to context immediately
    addMessage(userMessage);
    
    // Persist to database
    await persistMessage(userMessage);
    
    const messageToProcess = input;
    setInput('');
    
    await processMessage(messageToProcess, messageId);
  };

  // Generate current system prompt for preview
  const generatedPrompt = `You are an intelligent AI assistant with access to powerful tools and self-improvement capabilities.

**🧠 UNIFIED RESPONSE STRATEGY:**
1. **ANSWER DIRECTLY** from your general knowledge for simple questions
2. **USE TOOLS WHEN VALUABLE** for:
   - Current/real-time information
   - Searching your previous knowledge and uploaded documents
   - External data not in your general knowledge
   - Multi-step research or analysis
   - Specific data from external sources
3. **BE PROACTIVE** - When users describe problems that match tool use cases, suggest or use tools directly

${loopEnabled ? `**🔄 SELF-IMPROVEMENT CAPABILITY:**
After providing your initial response, you may reflect and decide to improve it further through:
- Additional tool usage for more comprehensive information
- Deeper analysis of the topic
- Alternative perspectives or approaches
- Enhanced detail where valuable` : `**🔄 SINGLE RESPONSE MODE:**
Loops are disabled. Provide your best response in a single iteration.`}

**🛠️ Available Tools:**
[Tool descriptions would be dynamically inserted here]

**💡 Decision Guidelines:**
- Simple greetings like "hello" → respond directly
- Basic questions you can answer → respond directly  
- Need previous knowledge → use Knowledge Search tool
- Need current information → use Web Search tool
- Complex research → use multiple tools progressively
- Don't overuse tools - your general knowledge is extensive

Remember: You have comprehensive knowledge. Tools are available when needed, not required for every response.`;

  return (
    <div className="flex h-full">
      {showSessions && (
        <SessionsSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onStartNewSession={startNewSession}
          onLoadSession={handleLoadSession}
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
          loopEnabled={loopEnabled}
          onToggleLoop={handleToggleLoop}
          onOpenPromptEditor={() => setShowPromptEditor(true)}
          useCustomPrompt={useCustomPrompt}
        />
        
        <SimplifiedChatInterface
          conversations={[]} // Not used anymore
          isLoading={isLoading}
          modelSettings={modelSettings}
          tools={[]} // Not used anymore
          toolsActive={false} // Not used anymore
          scrollAreaRef={scrollAreaRef}
          onFollowUpAction={handleFollowUpAction}
        />
        
        <SimplifiedChatInput
          input={input}
          onInputChange={setInput}
          onSendMessage={sendMessage}
          isLoading={isLoading}
          modelProvider={modelSettings.provider}
        />
      </div>

      <SystemPromptEditor
        isOpen={showPromptEditor}
        onClose={() => setShowPromptEditor(false)}
        generatedPrompt={generatedPrompt}
        customPrompt={customPrompt}
        useCustomPrompt={useCustomPrompt}
        onCustomPromptChange={setCustomPrompt}
        onUseCustomPromptChange={setUseCustomPrompt}
        onReset={resetToDefault}
        toolsCount={5} // This would be dynamically calculated
        loopEnabled={loopEnabled}
      />
    </div>
  );
};

export default AIAgentChat;
