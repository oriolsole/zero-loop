
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface StatusMessageProps {
  content: string;
  type?: 'thinking' | 'success' | 'error' | 'info';
  isAnimated?: boolean;
}

const StatusMessage: React.FC<StatusMessageProps> = ({ 
  content, 
  type = 'thinking', 
  isAnimated = true 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'thinking':
        return <Loader2 className={`h-4 w-4 text-blue-500 ${isAnimated ? 'animate-spin' : ''}`} />;
      default:
        return <Bot className="h-4 w-4 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/30';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30';
      case 'thinking':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800/30';
    }
  };

  return (
    <div className="flex gap-3 justify-start animate-fade-in">
      <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
        <AvatarFallback className="bg-secondary">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className={`rounded-lg px-4 py-3 max-w-[80%] border ${getBgColor()}`}>
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-sm text-muted-foreground">
            {content}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatusMessage;
