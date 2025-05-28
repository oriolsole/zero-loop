
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, User, RotateCcw, Lightbulb, Wrench, CheckCircle, Eye } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { ToolProgressItem } from '@/types/tools';
import MarkdownRenderer from './MarkdownRenderer';
import EnhancedToolCard from './EnhancedToolCard';

interface UnifiedMessageDisplayProps {
  message: ConversationMessage;
  activeTool?: ToolProgressItem | null;
  onFollowUpAction?: (action: string) => void;
}

const UnifiedMessageDisplay: React.FC<UnifiedMessageDisplayProps> = ({ 
  message, 
  activeTool, 
  onFollowUpAction 
}) => {
  const isUser = message.role === 'user';
  const isLoopIteration = (message.loopIteration || 0) > 0;

  const getMessageTypeIcon = () => {
    switch (message.messageType) {
      case 'loop-start':
        return <RotateCcw className="h-3 w-3 text-blue-500" />;
      case 'loop-reflection':
        return <Eye className="h-3 w-3 text-purple-500" />;
      case 'tool-executing':
        return <Wrench className="h-3 w-3 text-orange-500" />;
      case 'loop-enhancement':
        return <Lightbulb className="h-3 w-3 text-green-500" />;
      case 'loop-complete':
        return <CheckCircle className="h-3 w-3 text-emerald-500" />;
      default:
        return null;
    }
  };

  // Parse tool message if it's a tool execution
  const parseToolMessage = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.toolName && parsed.status) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  const isToolMessage = message.messageType === 'tool-executing' && 
                        message.content.startsWith('{');
  const toolData = isToolMessage ? parseToolMessage(message.content) : null;

  // For tool execution messages, show the tool card
  if (isToolMessage && toolData) {
    const toolProgressItem: ToolProgressItem = {
      id: toolData.toolCallId || `${message.id}-tool`,
      name: toolData.toolName,
      displayName: toolData.displayName || toolData.toolName,
      status: toolData.status as any,
      startTime: toolData.startTime,
      endTime: toolData.endTime,
      parameters: toolData.parameters || {},
      result: toolData.result,
      error: toolData.error,
      progress: toolData.progress || (
        toolData.status === 'completed' ? 100 : 
        toolData.status === 'failed' ? 0 : 
        toolData.status === 'executing' ? 50 : 0
      )
    };

    return (
      <div className="flex gap-4 justify-start animate-in fade-in duration-200">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 max-w-4xl mr-12">
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Wrench className="h-3 w-3 text-orange-500" />
            <Badge variant="outline" className="text-xs">
              Tool Execution
            </Badge>
          </div>
          
          <EnhancedToolCard tool={toolProgressItem} compact={false} />
          
          <div className="text-xs text-muted-foreground mt-2">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  }

  // Regular message rendering
  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
      {!isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex-1 max-w-4xl ${isUser ? 'flex justify-end' : ''}`}>
        <div className={`
          rounded-2xl px-4 py-3 border
          ${isUser 
            ? 'bg-primary text-primary-foreground ml-12' 
            : 'bg-secondary mr-12'
          }
        `}>
          {/* Loop iteration and message type indicator */}
          {!isUser && (isLoopIteration || message.messageType) && (
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              {getMessageTypeIcon()}
              {isLoopIteration && (
                <span className="text-foreground font-medium">Loop {message.loopIteration}</span>
              )}
              {message.messageType && (
                <Badge variant="outline" className="text-xs">
                  {message.messageType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              )}
            </div>
          )}
          
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {isUser ? (
              <p className="text-primary-foreground m-0">{message.content}</p>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </div>
          
          {/* Improvement reasoning for reflection messages */}
          {message.improvementReasoning && !isUser && message.messageType === 'loop-reflection' && (
            <div className="mt-3 p-3 bg-muted/70 border border-muted-foreground/40 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-purple-700">
                  Why I'm improving:
                </span>
              </div>
              <p className="m-0 text-muted-foreground leading-relaxed">{message.improvementReasoning}</p>
            </div>
          )}
          
          {/* Tools used indicator */}
          {message.toolsUsed && message.toolsUsed.length > 0 && !isUser && !isToolMessage && (
            <div className="flex flex-wrap gap-1 mt-3">
              {message.toolsUsed.map((tool, index) => (
                <Badge 
                  key={index} 
                  variant={tool.success ? "default" : "destructive"}
                  className="text-xs"
                >
                  {tool.name}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground mt-2">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      {isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-secondary">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default UnifiedMessageDisplay;
