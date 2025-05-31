
import React, { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare, Search, Github, Brain } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { ModelProvider } from '@/services/modelProviderService';
import { useConversationContext } from '@/contexts/ConversationContext';
import UnifiedMessageDisplay from './UnifiedMessageDisplay';
import StatusMessage from './StatusMessage';
import DebugInfo from './DebugInfo';

interface SimplifiedChatInterfaceProps {
  conversations: ConversationMessage[]; // Keep for compatibility but won't use
  isLoading: boolean;
  modelSettings: {
    provider: ModelProvider;
    selectedModel?: string;
  };
  tools: any[]; // Keep for compatibility but won't use
  toolsActive: boolean; // Keep for compatibility but won't use
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  onFollowUpAction?: (action: string) => void;
}

const SimplifiedChatInterface: React.FC<SimplifiedChatInterfaceProps> = ({
  isLoading,
  modelSettings,
  scrollAreaRef,
  onFollowUpAction
}) => {
  // Use context as single source of truth
  const { messages, activeTool } = useConversationContext();

  // Debug logging
  useEffect(() => {
    console.log(`🎯 [INTERFACE] Messages updated: ${messages.length}`, 
      messages.map(m => ({ 
        id: m.id.substring(0, 8), 
        role: m.role, 
        messageType: m.messageType, 
        content: m.content.substring(0, 30) + '...' 
      }))
    );
  }, [messages]);

  const suggestedActions = [
    {
      icon: <MessageSquare className="h-4 w-4" />,
      title: "General Questions",
      description: "Ask me anything you'd like to know",
      action: "What can you help me with today?"
    },
    {
      icon: <Search className="h-4 w-4" />,
      title: "Research & Analysis",
      description: "Get current information and insights",
      action: "Research the latest developments in artificial intelligence"
    },
    {
      icon: <Github className="h-4 w-4" />,
      title: "Code & Development",
      description: "Programming help and code analysis",
      action: "Help me analyze and improve my code"
    },
    {
      icon: <Brain className="h-4 w-4" />,
      title: "Problem Solving",
      description: "Complex analysis and decision making",
      action: "Help me break down and solve a complex problem"
    }
  ];

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-background/95 relative">
      <DebugInfo />
      
      <ScrollArea className="h-full" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-20 h-20 mb-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center shadow-lg">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-3 text-foreground">
                  Welcome to AI Assistant
                </h2>
                <p className="text-muted-foreground text-lg mb-2 max-w-2xl">
                  I'm here to help with analysis, research, problem-solving, and general assistance.
                </p>
                <p className="text-muted-foreground/80 text-sm">
                  I can use various tools when they add value to help answer your questions.
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

          {/* Display all messages with unified component */}
          <div className="space-y-6">
            {messages.map((message) => (
              <UnifiedMessageDisplay
                key={message.id}
                message={message}
                activeTool={activeTool}
                onFollowUpAction={onFollowUpAction}
              />
            ))}
          </div>
          
          {/* Show active tool if present */}
          {activeTool && (
            <div className="mt-6 animate-in fade-in duration-200">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Active Tool:
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-muted-foreground/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">{activeTool.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {activeTool.status}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {isLoading && (
            <div className="mt-8 animate-in fade-in duration-200">
              <StatusMessage 
                content="Processing your request..."
                type="thinking"
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SimplifiedChatInterface;
