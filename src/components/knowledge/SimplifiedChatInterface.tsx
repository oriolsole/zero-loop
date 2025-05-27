
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2 } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { ModelProvider } from '@/services/modelProviderService';
import { ToolProgressItem } from '@/types/tools';
import AIAgentMessage from './AIAgentMessage';
import ToolExecutionCard from './ToolExecutionCard';
import StatusMessage from './StatusMessage';

interface SimplifiedChatInterfaceProps {
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

const SimplifiedChatInterface: React.FC<SimplifiedChatInterfaceProps> = ({
  conversations,
  isLoading,
  modelSettings,
  tools,
  toolsActive,
  scrollAreaRef,
  onFollowUpAction
}) => {
  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full px-6" ref={scrollAreaRef}>
        <div className="space-y-6 py-6">
          {conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="w-16 h-16 mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              
              <h2 className="text-xl font-medium mb-2">Welcome to AI Assistant</h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                I can help you with analysis, research, coding, and complex problem-solving tasks.
              </p>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Try asking me about:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="secondary">Web search</Badge>
                  <Badge variant="secondary">Knowledge base</Badge>
                  <Badge variant="secondary">GitHub analysis</Badge>
                  <Badge variant="secondary">Code review</Badge>
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
          
          {toolsActive && tools.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Working...</span>
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
              content="Processing..."
              type="thinking"
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SimplifiedChatInterface;
