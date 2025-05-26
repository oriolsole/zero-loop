
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, User, Wrench, Brain } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import EnhancedToolDecisionDisplay, { EnhancedToolDecision } from './EnhancedToolDecision';

interface AIAgentMessageProps {
  message: ConversationMessage;
  normalizeToolDecision: (decision: any) => EnhancedToolDecision;
}

const AIAgentMessage: React.FC<AIAgentMessageProps> = ({ message, normalizeToolDecision }) => {
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role === 'assistant' && (
        <Avatar className="h-8 w-8 mt-0.5">
          <AvatarFallback>
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div 
        className={`rounded-lg px-4 py-3 max-w-[80%] ${
          message.role === 'user' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-secondary'
        }`}
      >
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        
        {message.toolDecision && message.role === 'assistant' && (
          <EnhancedToolDecisionDisplay decision={normalizeToolDecision(message.toolDecision)} />
        )}
        
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-3 space-y-2">
            <Separator />
            <div className="flex flex-wrap gap-1">
              {message.toolsUsed.map((tool, index) => (
                <Badge 
                  key={index} 
                  variant={tool.success ? "default" : "destructive"}
                  className="text-xs"
                >
                  <Wrench className="h-3 w-3 mr-1" />
                  {tool.name.replace('execute_', '')}
                  {!tool.success && ' (failed)'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {message.selfReflection && (
          <div className="mt-3 p-2 rounded bg-muted/50 border-l-2 border-primary">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
              <Brain className="h-3 w-3" />
              Self-Reflection
            </div>
            <p className="text-xs text-muted-foreground">
              {message.selfReflection}
            </p>
          </div>
        )}
        
        <div className="text-xs opacity-70 mt-2">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
      
      {message.role === 'user' && (
        <Avatar className="h-8 w-8 mt-0.5">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default AIAgentMessage;
