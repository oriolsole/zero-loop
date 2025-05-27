
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import AIAgentChat from '@/components/knowledge/AIAgentChat';

const AIAgent: React.FC = () => {
  return (
    <MainLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <AIAgentChat />
      </div>
    </MainLayout>
  );
};

export default AIAgent;
