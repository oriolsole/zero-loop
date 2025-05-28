
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2, Sparkles, Search, Database, Github } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { ModelProvider } from '@/services/modelProviderService';
import { ToolProgressItem } from '@/types/tools';
import AIAgentMessage from './AIAgentMessage';
import ToolExecutionCard from './ToolExecutionCard';
import StatusMessage from './StatusMessage';

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
}

const AIAgentChatInterface: React.FC<AIAgentChatInterfaceProps> = ({
  conversations,
  isLoading,
  modelSettings,
  tools,
  toolsActive,
  scrollAreaRef,
  onFollowUpAction
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

  const activeTool = tools.find(tool => 
    tool.status === 'executing' || tool.status === 'starting'
  );

  return (
    <CardContent className="flex-1 overflow-hidden p-0">
      <ScrollArea className="h-full px-6" ref={scrollAreaRef}>
        <div className="space-y-6 py-4">
          {conversations.length === 0 && (
            <div className="text-center py-16">
              <div className="relative mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <Bot className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI Agent Ready
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                I'm your intelligent assistant with advanced planning capabilities, real-time tools, and adaptive reasoning.
              </p>
              
              <div className="flex items-center justify-center gap-2 text-sm mb-6">
                <span className="text-gray-500">Currently using:</span>
                <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200">
                  <span>{getProviderIcon(modelSettings.provider)}</span>
                  <span className="font-semibold">
                    {modelSettings.provider.toUpperCase()}
                    {modelSettings.selectedModel && ` - ${modelSettings.selectedModel}`}
                  </span>
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
                <button 
                  onClick={() => onFollowUpAction?.("What are the latest AI developments?")}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  <Search className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-blue-700">Web Search</p>
                  <p className="text-xs text-blue-600">Real-time information</p>
                </button>
                <button 
                  onClick={() => onFollowUpAction?.("Search my knowledge base for insights about AI")}
                  className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200 hover:border-green-300 transition-colors cursor-pointer"
                >
                  <Database className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-700">Knowledge Base</p>
                  <p className="text-xs text-green-600">Semantic memory</p>
                </button>
                <button 
                  onClick={() => onFollowUpAction?.("Analyze the latest commits in a GitHub repository")}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200 hover:border-purple-300 transition-colors cursor-pointer"
                >
                  <Github className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-purple-700">GitHub Tools</p>
                  <p className="text-xs text-purple-600">Code analysis</p>
                </button>
              </div>
              
              <div className="space-y-2 text-sm text-gray-500">
                <p className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Try: "What are the latest AI developments?"
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Search className="h-4 w-4 text-blue-500" />
                  Or: "Search for React 19 features and changes"
                </p>
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
          
          {/* Tool Execution Progress */}
          {toolsActive && tools.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Tools in progress...</span>
              </div>
              
              <div className="grid gap-2">
                {tools.map((tool) => (
                  <ToolExecutionCard 
                    key={tool.id} 
                    tool={tool} 
                    compact={true}
                  />
                ))}
              </div>
            </div>
          )}
          
          {isLoading && !toolsActive && (
            <StatusMessage 
              content={`Processing with ${modelSettings.provider.toUpperCase()}...`}
              type="thinking"
            />
          )}
        </div>
      </ScrollArea>
    </CardContent>
  );
};

export default AIAgentChatInterface;
