
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Zap, Search, CheckCircle, Brain, Cog, Clock } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import MarkdownRenderer from './MarkdownRenderer';

interface AIAgentMessageProps {
  message: ConversationMessage;
  onFollowUpAction?: (action: string) => void;
}

const AIAgentMessage: React.FC<AIAgentMessageProps> = ({ message, onFollowUpAction }) => {
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageIcon = () => {
    if (message.role === 'user') return <User className="h-4 w-4 text-primary" />;
    
    switch (message.messageType) {
      case 'thinking':
        return <Brain className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-pulse" />;
      case 'tool-usage':
        return <Cog className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />;
      case 'tool-result':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'reflection':
        return <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'autonomous':
        return <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      default:
        return <Bot className="h-4 w-4 text-primary" />;
    }
  };

  const getMessageStyle = () => {
    if (message.role === 'user') return 'bg-primary text-primary-foreground ml-16 shadow-sm';
    if (message.role === 'error') return 'bg-red-50 border border-red-200 mr-16 shadow-sm';
    
    switch (message.messageType) {
      case 'thinking':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30 mr-16 shadow-sm';
      case 'tool-usage':
        return 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 mr-16 shadow-sm';
      case 'tool-result':
        return 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 mr-16 shadow-sm';
      case 'reflection':
        return 'bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 mr-16 shadow-sm';
      case 'autonomous':
        return 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800/30 mr-16 shadow-sm';
      default:
        return 'bg-secondary/40 border border-border/50 mr-16 shadow-sm';
    }
  };

  const getAvatarStyle = () => {
    if (message.role === 'user') return 'bg-primary/10 border border-primary/20';
    if (message.role === 'error') return 'bg-red-100 border border-red-300';
    
    switch (message.messageType) {
      case 'thinking':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700/50';
      case 'tool-usage':
        return 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700/50';
      case 'tool-result':
        return 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700/50';
      case 'reflection':
        return 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700/50';
      case 'autonomous':
        return 'bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border border-purple-300 dark:border-purple-700/50';
      default:
        return 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20';
    }
  };

  const getMessageTypeLabel = () => {
    switch (message.messageType) {
      case 'thinking':
        return 'Analyzing...';
      case 'tool-usage':
        return 'Using Tools...';
      case 'tool-result':
        return 'Results';
      case 'reflection':
        return 'Reflecting...';
      case 'autonomous':
        return 'Autonomous Follow-up';
      default:
        return null;
    }
  };

  return (
    <div className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {message.role !== 'user' && (
        <Avatar className={`h-8 w-8 mt-1 flex-shrink-0 shadow-sm ${getAvatarStyle()}`}>
          <AvatarFallback className="bg-transparent">
            {getMessageIcon()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`rounded-2xl px-5 py-4 max-w-[75%] ${getMessageStyle()}`}>
        {getMessageTypeLabel() && (
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-current/20">
            <Clock className="h-3 w-3" />
            <span className="text-xs font-medium uppercase tracking-wide">
              {getMessageTypeLabel()}
            </span>
          </div>
        )}

        <div className="text-sm leading-relaxed">
          <MarkdownRenderer content={message.content} />
        </div>
        
        <div className="text-xs opacity-60 mt-3 text-right">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
      
      {message.role === 'user' && (
        <Avatar className="h-8 w-8 mt-1 flex-shrink-0 shadow-sm">
          <AvatarFallback className="bg-primary/10 border border-primary/20">
            <User className="h-4 w-4 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default AIAgentMessage;
