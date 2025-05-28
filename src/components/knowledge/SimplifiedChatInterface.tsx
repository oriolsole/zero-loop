
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles, Search, Github, Code, Database } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { ModelProvider } from '@/services/modelProviderService';
import { ToolProgressItem } from '@/types/tools';
import AIAgentMessage from './AIAgentMessage';
import ToolExecutionStatus from './ToolExecutionStatus';

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
  streamingSteps?: any[];
  isStreaming?: boolean;
  workingStatus?: string;
  currentTool?: string;
  toolProgress?: number;
}

const SimplifiedChatInterface: React.FC<SimplifiedChatInterfaceProps> = ({
  conversations,
  isLoading,
  modelSettings,
  tools,
  toolsActive,
  scrollAreaRef,
  onFollowUpAction,
  isStreaming = false,
  workingStatus = "Processing your request...",
  currentTool,
  toolProgress
}) => {
  const suggestedActions = [
    {
      icon: <Search className="h-4 w-4" />,
      title: "Web Search",
      description: "Search the web for information",
      action: "Search for the latest AI developments"
    },
    {
      icon: <Github className="h-4 w-4" />,
      title: "GitHub Analysis",
      description: "Analyze GitHub repositories",
      action: "Analyze a GitHub repository for code quality"
    },
    {
      icon: <Code className="h-4 w-4" />,
      title: "Code Review",
      description: "Review and improve code",
      action: "Help me review and optimize my React code"
    },
    {
      icon: <Database className="h-4 w-4" />,
      title: "Knowledge Base",
      description: "Query knowledge base",
      action: "Search my knowledge base for relevant information"
    }
  ];

  return (
    <div className="flex-1 overflow-hidden bg-background">
      <ScrollArea className="h-full" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          {conversations.length === 0 && !isStreaming && !isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-20 h-20 mb-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center shadow-lg border border-border/20">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-3 text-foreground">
                  Welcome to AI Assistant
                </h2>
                <p className="text-muted-foreground text-lg mb-2 max-w-2xl">
                  I'm here to help with analysis, research, coding, and complex problem-solving.
                </p>
                <p className="text-muted-foreground/80 text-sm">
                  Choose a starting point below or ask me anything directly.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestedActions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => onFollowUpAction?.(suggestion.action)}
                    className="h-auto p-4 text-left justify-start bg-secondary/20 hover:bg-secondary/30 border-border/50 hover:border-primary/30 transition-all duration-200"
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

          <div className="space-y-4">
            {conversations.map((message) => (
              <div key={message.id} className="animate-fade-in">
                <AIAgentMessage 
                  message={message}
                  onFollowUpAction={onFollowUpAction}
                />
              </div>
            ))}
          </div>
          
          {/* Tool Execution Status - Shows active and completed tools */}
          {tools.length > 0 && (
            <div className="mt-6 space-y-4 animate-fade-in">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Tools & Analysis</span>
              </div>
              
              <div className="grid gap-3">
                {tools.map((tool) => (
                  <ToolExecutionStatus 
                    key={tool.id} 
                    tool={tool}
                    showResult={tool.status === 'completed'}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SimplifiedChatInterface;
