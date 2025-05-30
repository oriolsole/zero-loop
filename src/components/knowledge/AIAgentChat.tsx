
import React, { useRef, useEffect, useState } from 'react';
import { useSystemPrompt } from '@/hooks/useSystemPrompt';
import { useGeneratedSystemPrompt } from '@/hooks/useGeneratedSystemPrompt';
import { useConversationContext } from '@/contexts/ConversationContext';
import { useAIAgentChat } from '@/hooks/conversation/useAIAgentChat';
import { useChatActions } from '@/hooks/conversation/useChatActions';
import { useChatInitialization } from '@/hooks/conversation/useChatInitialization';
import { useQuickModelChange } from '@/hooks/conversation/useQuickModelChange';
import SimplifiedChatInterface from './SimplifiedChatInterface';
import SimplifiedChatInput from './SimplifiedChatInput';
import SimplifiedChatHeader from './SimplifiedChatHeader';
import SessionsSidebar from './SessionsSidebar';
import SystemPromptEditor from './SystemPromptEditor';

const AIAgentChat: React.FC = () => {
  const {
    messages,
    isLoading,
    input,
    setInput,
    activeTool
  } = useConversationContext();

  const {
    modelSettings,
    loopEnabled,
    handleToggleLoop,
    handleAgentChange,
    processMessage,
    currentAgent,
    setCurrentAgent
  } = useAIAgentChat();

  const { handleFollowUpAction, sendMessage } = useChatActions(processMessage);
  
  const {
    sessions,
    isLoadingSessions,
    startNewSession,
    deleteSession,
    handleLoadSession
  } = useChatInitialization();

  const { changeAgentModel } = useQuickModelChange();

  const [showSessions, setShowSessions] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // System prompt management
  const {
    customPrompt,
    useCustomPrompt,
    setCustomPrompt,
    setUseCustomPrompt,
    resetToDefault
  } = useSystemPrompt();

  // Generated system prompt hook
  const { generatedPrompt } = useGeneratedSystemPrompt({
    customPrompt,
    useCustomPrompt,
    loopEnabled,
    agentId: currentAgent?.id || null
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, activeTool]);

  const handleModelChange = async (modelId: string) => {
    if (!currentAgent) return;

    const updatedAgent = await changeAgentModel(currentAgent, modelId);
    if (updatedAgent && setCurrentAgent) {
      setCurrentAgent(updatedAgent);
    }
  };

  return (
    <div className="flex h-full">
      {showSessions && (
        <SessionsSidebar
          sessions={sessions}
          currentSessionId={useConversationContext().currentSessionId}
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
          loopEnabled={currentAgent?.loop_enabled || loopEnabled}
          onToggleLoop={handleToggleLoop}
          onOpenPromptEditor={() => setShowPromptEditor(true)}
          useCustomPrompt={useCustomPrompt}
          currentAgent={currentAgent}
          onAgentChange={handleAgentChange}
          onModelChange={handleModelChange}
        />
        
        <SimplifiedChatInterface
          conversations={[]}
          isLoading={isLoading}
          modelSettings={modelSettings}
          tools={[]}
          toolsActive={false}
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
        toolsCount={5}
        loopEnabled={currentAgent?.loop_enabled || loopEnabled}
      />
    </div>
  );
};

export default AIAgentChat;
