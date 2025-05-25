
import React from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import AIAgentChat from '@/components/knowledge/AIAgentChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Cpu, Search, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AIAgent: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Bot className="h-8 w-8" />
            AI Agent
          </h1>
          <p className="text-muted-foreground">
            An intelligent agent that can use tools, search the web, and access your knowledge base
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Chat Interface */}
          <div className="lg:col-span-2">
            <AIAgentChat />
          </div>
          
          {/* Agent Capabilities */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Agent Capabilities
                </CardTitle>
                <CardDescription>
                  What this AI agent can do for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Search className="h-5 w-5 mt-0.5 text-blue-500" />
                  <div>
                    <h4 className="font-medium">Web Search</h4>
                    <p className="text-sm text-muted-foreground">
                      Search the internet for current information
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 mt-0.5 text-green-500" />
                  <div>
                    <h4 className="font-medium">Knowledge Base</h4>
                    <p className="text-sm text-muted-foreground">
                      Access your personal knowledge repository
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Bot className="h-5 w-5 mt-0.5 text-purple-500" />
                  <div>
                    <h4 className="font-medium">Tool Orchestration</h4>
                    <p className="text-sm text-muted-foreground">
                      Use multiple tools in sequence to complete complex tasks
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Example Queries</CardTitle>
                <CardDescription>
                  Try asking the agent to help you with:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant="outline" className="w-full justify-start p-2 h-auto">
                  "Search for the latest AI research papers"
                </Badge>
                <Badge variant="outline" className="w-full justify-start p-2 h-auto">
                  "Find information about quantum computing in my knowledge base"
                </Badge>
                <Badge variant="outline" className="w-full justify-start p-2 h-auto">
                  "Research climate change solutions and save to my knowledge base"
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AIAgent;
