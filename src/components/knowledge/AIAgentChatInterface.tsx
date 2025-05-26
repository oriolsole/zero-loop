
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2, Sparkles, Search, Database, Github, Send, Zap } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { ModelProvider } from '@/services/modelProviderService';
import { ToolProgressItem } from '@/types/tools';
import AIAgentMessage from './AIAgentMessage';

interface AIAgentChatInterfaceProps {
  conversations: ConversationMessage[];
  isLoading: boolean;
  modelSettings: {
    provider: ModelProvider;
    selectedModel?: string;
  };
  tools: ToolProgressItem[];
  toolsActive: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  onFollowUpAction?: (action: string) => void;
  onQuickStart?: (suggestion: string) => void;
}

const AIAgentChatInterface: React.FC<AIAgentChatInterfaceProps> = ({
  conversations,
  isLoading,
  modelSettings,
  tools,
  toolsActive,
  scrollAreaRef,
  onFollowUpAction,
  onQuickStart
}) => {
  const getProviderIcon = (provider: ModelProvider) => {
    switch (provider) {
      case 'openai':
        return '☁️';
      case 'local':
        return '💾';
      case 'npaw':
        return '⚡';
      default:
        return '🤖';
    }
  };

  const quickStartSuggestions = [
    {
      text: "What are the latest AI developments?",
      icon: Search,
      category: "Research"
    },
    {
      text: "Search for React 19 features and changes",
      icon: Search,
      category: "Technical"
    },
    {
      text: "Analyze this GitHub repository for best practices",
      icon: Github,
      category: "Code Review"
    },
    {
      text: "Find recent developments in quantum computing",
      icon: Database,
      category: "Knowledge"
    }
  ];

  return (
    <CardContent className="flex-1 overflow-hidden p-0">
      <ScrollArea className="h-full px-6" ref={scrollAreaRef}>
        <div className="space-y-6 py-4">
          {conversations.length === 0 && (
            <div className="text-center py-16">
              <div className="relative mb-8">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                  <Bot className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="h-4 w-4 text-white animate-spin" />
                </div>
              </div>
              
              <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI Agent Ready
              </h3>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto text-lg">
                Your intelligent assistant with advanced planning, real-time tools, and adaptive reasoning capabilities.
              </p>
              
              <div className="flex items-center justify-center gap-3 text-sm mb-8">
                <span className="text-gray-500 font-medium">Powered by:</span>
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 shadow-sm">
                  <span className="text-lg">{getProviderIcon(modelSettings.provider)}</span>
                  <span className="font-semibold">
                    {modelSettings.provider.toUpperCase()}
                    {modelSettings.selectedModel && ` - ${modelSettings.selectedModel}`}
                  </span>
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-10">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-2xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                  <Search className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                  <p className="text-base font-semibold text-blue-700 mb-1">Web Search</p>
                  <p className="text-sm text-blue-600">Real-time information retrieval</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-2xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                  <Database className="h-8 w-8 text-green-500 mx-auto mb-3" />
                  <p className="text-base font-semibold text-green-700 mb-1">Knowledge Base</p>
                  <p className="text-sm text-green-600">Semantic memory access</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-6 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                  <Github className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                  <p className="text-base font-semibold text-purple-700 mb-1">GitHub Tools</p>
                  <p className="text-sm text-purple-600">Code analysis & review</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <h4 className="text-xl font-semibold text-gray-800 mb-4">Quick Start Suggestions</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {quickStartSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => onQuickStart?.(suggestion.text)}
                      className="h-auto p-4 text-left hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 border-2 hover:border-purple-200 transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <suggestion.icon className="h-5 w-5 text-purple-500 mt-0.5 group-hover:text-purple-600" />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-800 group-hover:text-purple-700 mb-1">
                            {suggestion.text}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.category}
                          </Badge>
                        </div>
                        <Send className="h-4 w-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                      </div>
                    </Button>
                  ))}
                </div>
                
                <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Zap className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Pro tip:</span>
                    <span>I can handle complex multi-step tasks and will use the best tools for each job</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {conversations.map((message) => (
            <AIAgentMessage 
              key={message.id}
              message={message}
              onFollowUpAction={onFollowUpAction}
            />
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <Avatar className="h-9 w-9 mt-1 shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500">
                  <Bot className="h-5 w-5 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="ml-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl px-4 py-3 max-w-[80%] border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Processing with {modelSettings.provider.toUpperCase()}...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </CardContent>
  );
};

export default AIAgentChatInterface;
