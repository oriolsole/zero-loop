
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AIAgentChat from '@/components/knowledge/AIAgentChat';
import AIAgentTestTab from '@/components/knowledge/AIAgentTestTab';
import { Bot, MessageSquare, TestTube } from 'lucide-react';

const AIAgent: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8 text-purple-600" />
            AI Agent
          </h1>
          <p className="text-gray-600 mt-2">
            Intelligent assistant with adaptive reasoning and tool integration
          </p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="purple" className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            Learning Loop Active
          </Badge>
          <Badge variant="secondary">
            Multi-Tool Support
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Testing & Debug
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="mt-6">
          <AIAgentChat />
        </TabsContent>
        
        <TabsContent value="testing" className="mt-6">
          <AIAgentTestTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIAgent;
