
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2 } from 'lucide-react';
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
}

const AIAgentChatInterface: React.FC<AIAgentChatInterfaceProps> = ({
  conversations,
  isLoading,
  modelSettings,
  tools,
  toolsActive,
  scrollAreaRef
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

  return (
    <CardContent className="flex-1 overflow-hidden">
      <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {conversations.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-sm mb-4">
                I'm your AI assistant with enhanced memory and tool capabilities.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs mb-2">
                <span>Currently using:</span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>{getProviderIcon(modelSettings.provider)}</span>
                  <span className="font-medium">
                    {modelSettings.provider.toUpperCase()}
                    {modelSettings.selectedModel && ` - ${modelSettings.selectedModel}`}
                  </span>
                </Badge>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>💭 I remember context across our conversation</p>
                <p>🔧 I can search the web, access GitHub, and query knowledge bases</p>
                <p>🎯 Try: "Search for React hooks" or "Analyze a GitHub repository"</p>
              </div>
            </div>
          )}

          {conversations.map((message) => (
            <AIAgentMessage 
              key={message.id}
              message={message}
            />
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <Avatar className="h-8 w-8 mt-0.5">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="ml-3 bg-secondary rounded-lg px-4 py-3 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
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
