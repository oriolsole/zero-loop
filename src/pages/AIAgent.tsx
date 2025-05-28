
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import AIAgentChat from '@/components/knowledge/AIAgentChat';
import { ConversationProvider } from '@/contexts/ConversationContext';

const AIAgent: React.FC = () => {
  return (
    <MainLayout>
      <ConversationProvider>
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          <AIAgentChat />
        </div>
      </ConversationProvider>
    </MainLayout>
  );
};

export default AIAgent;
