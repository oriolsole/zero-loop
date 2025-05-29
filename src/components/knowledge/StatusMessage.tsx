
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, CheckCircle, AlertCircle } from 'lucide-react';

interface StatusMessageProps {
  content: string;
  type?: 'thinking' | 'success' | 'error' | 'info';
  isAnimated?: boolean;
}

const ThreeDotsLoader: React.FC = () => {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
    </div>
  );
};

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
        return isAnimated ? <ThreeDotsLoader /> : <Bot className="h-4 w-4 text-blue-500" />;
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
        return 'bg-gradient-to-r from-slate-800/90 to-slate-900/90 border-blue-500/20 dark:from-slate-800/90 dark:to-slate-900/90 dark:border-blue-400/30 backdrop-blur-sm';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800/30';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'thinking':
        return 'text-blue-100 dark:text-blue-200';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex gap-3 justify-start animate-fade-in">
      <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
        <AvatarFallback className="bg-secondary">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className={`rounded-lg px-4 py-3 max-w-[80%] border ${getBgColor()} ${type === 'thinking' ? 'animate-pulse' : ''}`}>
        <div className="flex items-center gap-3">
          {getIcon()}
          <span className={`text-sm font-medium ${getTextColor()}`}>
            {content}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatusMessage;
