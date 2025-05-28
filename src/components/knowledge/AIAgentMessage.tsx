
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, User, RotateCcw, Lightbulb } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import MarkdownRenderer from './MarkdownRenderer';

interface AIAgentMessageProps {
  message: ConversationMessage;
  onFollowUpAction?: (action: string) => void;
}

const AIAgentMessage: React.FC<AIAgentMessageProps> = ({ message, onFollowUpAction }) => {
  const isUser = message.role === 'user';
  const isLoopIteration = (message.loopIteration || 0) > 0;

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
          rounded-2xl px-4 py-3 
          ${isUser 
            ? 'bg-primary text-primary-foreground ml-12' 
            : 'bg-secondary/50 mr-12'
          }
        `}>
          {/* Loop iteration indicator */}
          {isLoopIteration && !isUser && (
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              <span>Loop iteration {message.loopIteration}</span>
              {message.improvementReasoning && (
                <Badge variant="outline" className="text-xs">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Improving
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
          
          {/* Improvement reasoning */}
          {message.improvementReasoning && !isUser && (
            <div className="mt-3 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <div className="flex items-center gap-1 mb-1">
                <Lightbulb className="h-3 w-3" />
                <span className="font-medium">Improvement reasoning:</span>
              </div>
              <p className="m-0">{message.improvementReasoning}</p>
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
