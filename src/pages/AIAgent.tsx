
import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import AIAgentChat from '@/components/knowledge/AIAgentChat';
import AgentGoalsPanel from '@/components/knowledge/AgentGoalsPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Cpu, Search, Database, Target, Brain, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { mcpService } from '@/services/mcpService';
import { toast } from '@/components/ui/sonner';

const AIAgent: React.FC = () => {
  const { user } = useAuth();
  const hasFixedMCPs = useRef(false);

  // Fix MCPs when component mounts - only once
  useEffect(() => {
    if (user && !hasFixedMCPs.current) {
      hasFixedMCPs.current = true;
      
      const fixMCPs = async () => {
        try {
          console.log('Fixing MCPs for improved tool execution...');
          
          // Clean up invalid MCPs first
          await mcpService.cleanupInvalidMCPs(user.id);
          
          // Fix GitHub Tools MCP endpoint
          await mcpService.fixGitHubToolsMCP(user.id);
          
          // Seed any missing default MCPs
          await mcpService.seedDefaultMCPs(user.id);
          
          console.log('MCPs fixed successfully');
        } catch (error) {
          console.error('Error fixing MCPs:', error);
          toast.error('Failed to optimize tools configuration');
        }
      };

      fixMCPs();
    }
  }, [user]); // Removed isFixingMCPs from dependencies

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Bot className="h-8 w-8" />
            AI Agent
            <Badge variant="outline" className="text-xs">
              Enhanced with Tool Execution
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            An intelligent agent with advanced capabilities: memory, self-reflection, goal planning, and real-time tool orchestration
          </p>
        </div>

        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals & Tasks
            </TabsTrigger>
            <TabsTrigger value="capabilities" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Capabilities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-6">
            <AIAgentChat />
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <AgentGoalsPanel />
            </div>
          </TabsContent>

          <TabsContent value="capabilities" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enhanced Capabilities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Enhanced Capabilities
                  </CardTitle>
                  <CardDescription>
                    Advanced features for intelligent task execution
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Brain className="h-5 w-5 mt-0.5 text-purple-500" />
                    <div>
                      <h4 className="font-medium">Self-Reflection</h4>
                      <p className="text-sm text-muted-foreground">
                        Analyzes tool results and suggests improvements
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 mt-0.5 text-green-500" />
                    <div>
                      <h4 className="font-medium">Goal Planning</h4>
                      <p className="text-sm text-muted-foreground">
                        Breaks down complex tasks into manageable steps
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 mt-0.5 text-blue-500" />
                    <div>
                      <h4 className="font-medium">Conversation Memory</h4>
                      <p className="text-sm text-muted-foreground">
                        Remembers context across sessions for better assistance
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Cpu className="h-5 w-5 mt-0.5 text-orange-500" />
                    <div>
                      <h4 className="font-medium">Real-Time Tool Execution</h4>
                      <p className="text-sm text-muted-foreground">
                        Uses multiple tools with live progress tracking and error recovery
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Core Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    Available Tools
                  </CardTitle>
                  <CardDescription>
                    Tools the agent actively uses to help you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Search className="h-5 w-5 mt-0.5 text-blue-500" />
                    <div>
                      <h4 className="font-medium">Web Search</h4>
                      <p className="text-sm text-muted-foreground">
                        Real-time internet search for current information
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Database className="h-5 w-5 mt-0.5 text-green-500" />
                    <div>
                      <h4 className="font-medium">Knowledge Base</h4>
                      <p className="text-sm text-muted-foreground">
                        Semantic search across your personal knowledge repository
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 mt-0.5 text-purple-500" />
                    <div>
                      <h4 className="font-medium">GitHub Integration</h4>
                      <p className="text-sm text-muted-foreground">
                        Access repositories, files, and code with GitHub token
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Example Queries */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Try These Enhanced Queries</CardTitle>
                  <CardDescription>
                    Test the agent's real-time tool execution capabilities:
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Badge variant="outline" className="justify-start p-3 h-auto">
                    "Search for the latest AI news from 2024"
                  </Badge>
                  <Badge variant="outline" className="justify-start p-3 h-auto">
                    "Find information about React 19 features"
                  </Badge>
                  <Badge variant="outline" className="justify-start p-3 h-auto">
                    "Search my knowledge base for machine learning notes"
                  </Badge>
                  <Badge variant="outline" className="justify-start p-3 h-auto">
                    "Look up the latest developments in quantum computing"
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default AIAgent;
