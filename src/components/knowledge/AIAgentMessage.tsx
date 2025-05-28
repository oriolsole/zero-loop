
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, User, RotateCcw, Lightbulb, Wrench, CheckCircle, Eye } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import MarkdownRenderer from './MarkdownRenderer';

interface AIAgentMessageProps {
  message: ConversationMessage;
  onFollowUpAction?: (action: string) => void;
}

const AIAgentMessage: React.FC<AIAgentMessageProps> = ({ message, onFollowUpAction }) => {
  const isUser = message.role === 'user';
  const isLoopIteration = (message.loopIteration || 0) > 0;

  const getMessageTypeStyles = () => {
    switch (message.messageType) {
      case 'loop-start':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/40';
      case 'loop-reflection':
        return 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800/40';
      case 'tool-executing':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/40';
      case 'loop-enhancement':
        return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/40';
      case 'loop-complete':
        return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40';
      default:
        return '';
    }
  };

  const getMessageTypeIcon = () => {
    switch (message.messageType) {
      case 'loop-start':
        return <RotateCcw className="h-3 w-3 text-blue-500 dark:text-blue-400" />;
      case 'loop-reflection':
        return <Eye className="h-3 w-3 text-purple-500 dark:text-purple-400" />;
      case 'tool-executing':
        return <Wrench className="h-3 w-3 text-orange-500 dark:text-orange-400" />;
      case 'loop-enhancement':
        return <Lightbulb className="h-3 w-3 text-green-500 dark:text-green-400" />;
      case 'loop-complete':
        return <CheckCircle className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />;
      default:
        return null;
    }
  };

  const isSpecialLoopMessage = ['loop-start', 'loop-reflection', 'tool-executing', 'loop-enhancement', 'loop-complete'].includes(message.messageType || '');

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
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
            : isSpecialLoopMessage
            ? `${getMessageTypeStyles()} mr-12`
            : 'bg-secondary/50 mr-12 dark:bg-secondary/30'
          }
        `}>
          {/* Loop iteration and message type indicator */}
          {!isUser && (isLoopIteration || isSpecialLoopMessage) && (
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground/90 dark:text-muted-foreground/80">
              {getMessageTypeIcon()}
              {isLoopIteration && (
                <span className="text-foreground/90 dark:text-foreground/80 font-medium">Loop {message.loopIteration}</span>
              )}
              {message.messageType && (
                <Badge variant="outline" className="text-xs border-current/40 dark:border-current/30 bg-background/60 dark:bg-background/40 text-foreground/80 dark:text-foreground/70">
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
          
          {/* Improvement reasoning for reflection messages - Enhanced dark theme */}
          {message.improvementReasoning && !isUser && message.messageType === 'loop-reflection' && (
            <div className="mt-3 p-3 bg-muted/70 border border-muted-foreground/40 rounded-lg text-sm dark:bg-muted/30 dark:border-muted-foreground/30">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  Why I'm improving:
                </span>
              </div>
              <p className="m-0 text-muted-foreground/90 dark:text-foreground/80 leading-relaxed">{message.improvementReasoning}</p>
            </div>
          )}
          
          {/* Tools used indicator */}
          {message.toolsUsed && message.toolsUsed.length > 0 && !isUser && (
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
          
          <div className="text-xs text-muted-foreground/70 mt-2 dark:text-muted-foreground/60">
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

export default AIAgentMessage;
