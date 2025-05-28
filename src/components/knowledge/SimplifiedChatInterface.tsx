
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare, Search, Github, Brain } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import AIAgentMessage from './AIAgentMessage';

interface SimplifiedChatInterfaceProps {
  conversations: ConversationMessage[];
  isLoading: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  onFollowUpAction?: (action: string) => void;
}

const SimplifiedChatInterface: React.FC<SimplifiedChatInterfaceProps> = ({
  conversations,
  isLoading,
  scrollAreaRef,
  onFollowUpAction
}) => {
  const suggestedActions = [
    {
      icon: <MessageSquare className="h-4 w-4" />,
      title: "Ask Questions",
      description: "I can help with analysis and problem-solving",
      action: "What can you help me with?"
    },
    {
      icon: <Search className="h-4 w-4" />,
      title: "Research Topics",
      description: "Get insights and current information",
      action: "Research recent developments in AI technology"
    },
    {
      icon: <Github className="h-4 w-4" />,
      title: "Code Analysis",
      description: "Help with programming and development",
      action: "Help me understand this codebase structure"
    },
    {
      icon: <Brain className="h-4 w-4" />,
      title: "Problem Solving",
      description: "Break down complex challenges",
      action: "Help me think through a complex decision"
    }
  ];

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-background/95">
      <ScrollArea className="h-full" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          {conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-20 h-20 mb-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center shadow-lg">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-3 text-foreground">
                  AI Assistant
                </h2>
                <p className="text-muted-foreground text-lg mb-2 max-w-2xl">
                  I'm here to help with analysis, research, and problem-solving.
                </p>
                <p className="text-muted-foreground/80 text-sm">
                  I'll use the right tools when they can help answer your questions.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestedActions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => onFollowUpAction?.(suggestion.action)}
                    className="h-auto p-4 text-left justify-start bg-secondary/30 hover:bg-secondary/50 border-border/50 hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        {suggestion.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground mb-1">
                          {suggestion.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {suggestion.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-8">
            {conversations.map((message) => (
              <AIAgentMessage 
                key={message.id}
                message={message}
                onFollowUpAction={onFollowUpAction}
              />
            ))}
          </div>
          
          {isLoading && (
            <div className="mt-8 flex items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span className="ml-2 text-sm">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SimplifiedChatInterface;
