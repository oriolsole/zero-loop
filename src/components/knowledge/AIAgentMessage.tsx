
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Zap, Search, CheckCircle } from 'lucide-react';
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

  const getMessageStyle = () => {
    if (message.role === 'user') return 'bg-primary text-primary-foreground ml-16 shadow-sm';
    if (message.role === 'error') return 'bg-red-50 border border-red-200 mr-16 shadow-sm';
    
    if (message.isAutonomous) {
      return 'bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800/30 mr-16 shadow-sm';
    }
    
    return 'bg-secondary/40 border border-border/50 mr-16 shadow-sm';
  };

  const getAvatarStyle = () => {
    if (message.role === 'user') return 'bg-primary/10 border border-primary/20';
    if (message.role === 'error') return 'bg-red-100 border border-red-300';
    
    if (message.isAutonomous) {
      return 'bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border border-purple-300 dark:border-purple-700/50';
    }
    
    return 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20';
  };

  // Parse function calls in the message content
  const parseFunctionCalls = (content: string) => {
    const functionCalls = [];
    
    // Search for tool usage indicators
    if (content.includes('🔍') || content.toLowerCase().includes('searching')) {
      functionCalls.push(
        <div key="search" className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <Search className="h-3 w-3 animate-pulse" />
          <span>Searching...</span>
        </div>
      );
    }
    
    // Look for completion indicators
    if (content.includes('✅') || content.toLowerCase().includes('found')) {
      functionCalls.push(
        <div key="complete" className="flex items-center gap-2 text-sm text-green-600 mt-2">
          <CheckCircle className="h-3 w-3" />
          <span>Search completed</span>
        </div>
      );
    }
    
    return functionCalls;
  };

  return (
    <div className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {message.role !== 'user' && (
        <Avatar className={`h-8 w-8 mt-1 flex-shrink-0 shadow-sm ${getAvatarStyle()}`}>
          <AvatarFallback className="bg-transparent">
            {message.isAutonomous ? (
              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            ) : (
              <Bot className="h-4 w-4 text-primary" />
            )}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`rounded-2xl px-5 py-4 max-w-[75%] ${getMessageStyle()}`}>
        {message.isAutonomous && (
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-200 dark:border-purple-800/30">
            <Zap className="h-3 w-3 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
              Autonomous Follow-up
            </span>
          </div>
        )}

        <div className="text-sm leading-relaxed">
          <MarkdownRenderer content={message.content} />
        </div>
        
        {parseFunctionCalls(message.content)}
        
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
