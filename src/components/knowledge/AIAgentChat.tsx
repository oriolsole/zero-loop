
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { modelProviderService } from '@/services/modelProviderService';
import { useConversationContext } from '@/hooks/useConversationContext';
import { useAgentConversation } from '@/hooks/useAgentConversation';
import { useToolProgress } from '@/hooks/useToolProgress';
import AIAgentHeader from './AIAgentHeader';
import AIAgentChatInterface from './AIAgentChatInterface';
import AIAgentInput from './AIAgentInput';
import SessionsSidebar from './SessionsSidebar';
import ToolProgressStream from './ToolProgressStream';

const AIAgentChat: React.FC = () => {
  const [input, setInput] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const [modelSettings, setModelSettings] = useState(modelProviderService.getSettings());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const { currentSessionId, switchSession, createNewSession } = useConversationContext();
  
  const {
    conversations,
    isLoading,
    sendMessage,
    handleFollowUpAction
  } = useAgentConversation(currentSessionId);

  const {
    tools,
    isActive: toolsActive
  } = useToolProgress();

  useEffect(() => {
    const settings = modelProviderService.getSettings();
    setModelSettings(settings);
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [conversations, isLoading]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleQuickStart = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleNewSession = () => {
    createNewSession();
    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {showSessions && (
        <div className="w-80 flex-shrink-0">
          <SessionsSidebar 
            currentSessionId={currentSessionId}
            onSessionSelect={switchSession}
            onNewSession={handleNewSession}
          />
        </div>
      )}
      
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <AIAgentHeader
            modelSettings={modelSettings}
            showSessions={showSessions}
            onToggleSessions={() => setShowSessions(!showSessions)}
            onNewSession={handleNewSession}
            isLoading={isLoading}
          />
          
          <AIAgentChatInterface
            conversations={conversations}
            isLoading={isLoading}
            modelSettings={modelSettings}
            tools={tools}
            toolsActive={toolsActive}
            scrollAreaRef={scrollAreaRef}
            onFollowUpAction={handleFollowUpAction}
            onQuickStart={handleQuickStart}
          />
          
          <AIAgentInput
            input={input}
            onInputChange={setInput}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            modelProvider={modelSettings.provider}
          />
        </Card>
        
        <ToolProgressStream tools={tools} isVisible={toolsActive} />
      </div>
    </div>
  );
};

export default AIAgentChat;
