
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
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30';
      case 'loop-reflection':
        return 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800/30';
      case 'tool-executing':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/30';
      case 'loop-enhancement':
        return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/30';
      case 'loop-complete':
        return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30';
      default:
        return '';
    }
  };

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
            : 'bg-secondary/50 mr-12'
          }
        `}>
          {/* Loop iteration and message type indicator */}
          {!isUser && (isLoopIteration || isSpecialLoopMessage) && (
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              {getMessageTypeIcon()}
              {isLoopIteration && (
                <span>Loop {message.loopIteration}</span>
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
            <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  Why I'm improving:
                </span>
              </div>
              <p className="m-0 text-muted-foreground">{message.improvementReasoning}</p>
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
          
          <div className="text-xs text-muted-foreground mt-2 opacity-70">
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
