
import React, { useRef, useEffect, useState } from 'react';
import { useSystemPrompt } from '@/hooks/useSystemPrompt';
import { useGeneratedSystemPrompt } from '@/hooks/useGeneratedSystemPrompt';
import { useConversationContext } from '@/contexts/ConversationContext';
import { useAIAgentChat } from '@/hooks/conversation/useAIAgentChat';
import { useChatActions } from '@/hooks/conversation/useChatActions';
import { useChatInitialization } from '@/hooks/conversation/useChatInitialization';
import { agentService, Agent } from '@/services/agentService';
import { toast } from '@/components/ui/sonner';
import SimplifiedChatInterface from './SimplifiedChatInterface';
import SimplifiedChatInput from './SimplifiedChatInput';
import SimplifiedChatHeader from './SimplifiedChatHeader';
import SessionsSidebar from './SessionsSidebar';
import SystemPromptEditor from './SystemPromptEditor';
import AgentFormModal from '@/components/agents/AgentFormModal';

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
    currentAgent
  } = useAIAgentChat();

  const { handleFollowUpAction, sendMessage } = useChatActions(processMessage);
  
  const {
    sessions,
    isLoadingSessions,
    startNewSession,
    deleteSession,
    handleLoadSession
  } = useChatInitialization();

  const [showSessions, setShowSessions] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);

  // System prompt management - now agent-aware
  const {
    customPrompt,
    useCustomPrompt,
    setCustomPrompt,
    setUseCustomPrompt,
    resetToDefault
  } = useSystemPrompt(currentAgent);

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

  // Handle saving custom prompt to agent
  const handleCustomPromptSave = async (newPrompt: string) => {
    if (!currentAgent) {
      toast.error('No agent selected');
      return;
    }

    try {
      const updatedAgent = await agentService.updateAgent({
        id: currentAgent.id,
        system_prompt: newPrompt.trim() || undefined
      });

      if (updatedAgent) {
        // Update the current agent in the chat context
        handleAgentChange(updatedAgent);
        setCustomPrompt(newPrompt);
        toast.success('Agent system prompt updated');
      }
    } catch (error) {
      console.error('Failed to update agent system prompt:', error);
      toast.error('Failed to save system prompt');
    }
  };

  // Handle agent configuration - open edit modal for current agent
  const handleOpenAgentConfig = () => {
    if (!currentAgent) {
      toast.error('No agent selected');
      return;
    }
    setModalMode('edit');
  };

  // Handle creating new agent
  const handleCreateAgent = () => {
    setModalMode('create');
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setModalMode(null);
  };

  // Handle agent creation/update
  const handleAgentSubmit = async (agentData: any) => {
    try {
      let savedAgent: Agent | null = null;
      
      if (modalMode === 'edit' && currentAgent) {
        // Update existing agent
        savedAgent = await agentService.updateAgent({
          id: currentAgent.id,
          ...agentData
        });
        toast.success('Agent updated successfully');
      } else if (modalMode === 'create') {
        // Create new agent
        savedAgent = await agentService.createAgent(agentData);
        toast.success('Agent created successfully');
      }

      if (savedAgent) {
        handleAgentChange(savedAgent);
      }
      
      setModalMode(null);
    } catch (error) {
      console.error('Failed to save agent:', error);
      toast.error('Failed to save agent');
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
          onOpenAgentConfig={handleOpenAgentConfig}
          onCreateAgent={handleCreateAgent}
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
        onCustomPromptChange={handleCustomPromptSave}
        onUseCustomPromptChange={setUseCustomPrompt}
        onReset={resetToDefault}
        toolsCount={5}
        loopEnabled={currentAgent?.loop_enabled || loopEnabled}
      />

      <AgentFormModal
        isOpen={modalMode !== null}
        onClose={handleCloseModal}
        onSubmit={handleAgentSubmit}
        mode={modalMode || 'create'}
        agent={modalMode === 'edit' ? currentAgent : null}
      />
    </div>
  );
};

export default AIAgentChat;
