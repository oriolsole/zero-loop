
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import AIAgentChat from '@/components/knowledge/AIAgentChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, MessageSquare } from "lucide-react";

const AIAgent: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">AI Agent</h1>
            <Badge variant="secondary" className="ml-2">
              Beta
            </Badge>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Intelligent assistant powered by advanced reasoning and tool integration. 
            Ask questions, request analysis, or get help with complex tasks.
          </p>
          
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Real-time reasoning</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Context-aware responses</span>
            </div>
          </div>
        </div>

        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Assistant
            </CardTitle>
            <CardDescription>
              Chat with the AI agent to get help with analysis, reasoning, and problem-solving tasks
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            <AIAgentChat />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AIAgent;
