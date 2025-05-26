
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2 } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { ModelProvider } from '@/services/modelProviderService';
import { EnhancedToolDecision } from './EnhancedToolDecision';
import ToolProgressStream from './ToolProgressStream';
import AIAgentMessage from './AIAgentMessage';

interface Tool {
  id: string;
  name: string;
  status: string;
  progress: number;
  result?: any;
  error?: string;
}

interface AIAgentChatInterfaceProps {
  conversations: ConversationMessage[];
  isLoading: boolean;
  modelSettings: {
    provider: ModelProvider;
    selectedModel?: string;
  };
  tools: Tool[];
  toolsActive: boolean;
  normalizeToolDecision: (decision: any) => EnhancedToolDecision;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
}

const AIAgentChatInterface: React.FC<AIAgentChatInterfaceProps> = ({
  conversations,
  isLoading,
  modelSettings,
  tools,
  toolsActive,
  normalizeToolDecision,
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
                I'm your enhanced AI agent with advanced reasoning, tool execution, and fallback strategies.
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
                <p>🚀 Enhanced with Lovable-style principles for better analysis and execution</p>
                <p>🔧 Available tools: Web Search, GitHub Tools, Knowledge Base Search</p>
                <p>🎯 Try: "Search GitHub for React hooks examples" or "Find recent AI news"</p>
                <p>💡 Tip: For GitHub access, configure your GitHub token in Settings</p>
              </div>
            </div>
          )}

          {conversations.map((message) => (
            <AIAgentMessage 
              key={message.id}
              message={message}
              normalizeToolDecision={normalizeToolDecision}
            />
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <Avatar className="h-8 w-8 mt-0.5">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="ml-3 bg-secondary rounded-lg px-4 py-3 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    Processing with enhanced {modelSettings.provider.toUpperCase()} analysis...
                  </span>
                </div>
                
                {(toolsActive || tools.length > 0) && (
                  <ToolProgressStream 
                    tools={tools}
                    isActive={toolsActive}
                    className="mt-3"
                  />
                )}
              </div>
            </div>
          )}

          {!isLoading && tools.length > 0 && (
            <div className="flex justify-start">
              <Avatar className="h-8 w-8 mt-0.5">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="ml-3 max-w-[80%]">
                <ToolProgressStream 
                  tools={tools}
                  isActive={false}
                />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </CardContent>
  );
};

export default AIAgentChatInterface;
