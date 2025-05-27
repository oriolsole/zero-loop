
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Loader2, CheckCircle, Settings, Search, Code, FileText, Globe } from 'lucide-react';

interface StreamingMessageProps {
  step: {
    id: string;
    type: 'step-announcement' | 'partial-result' | 'tool-announcement' | 'tool-status' | 'thinking';
    content: string;
    timestamp: Date;
    toolName?: string;
    toolAction?: string;
  };
  isAnimated?: boolean;
}

const StreamingMessage: React.FC<StreamingMessageProps> = ({ step, isAnimated = true }) => {
  const getIcon = () => {
    switch (step.type) {
      case 'tool-announcement':
        return getToolIcon(step.toolName);
      case 'partial-result':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'step-announcement':
        return <Loader2 className={`h-4 w-4 text-blue-500 ${isAnimated ? 'animate-spin' : ''}`} />;
      case 'thinking':
        return <Bot className="h-4 w-4 text-purple-500" />;
      default:
        return <Bot className="h-4 w-4 text-blue-500" />;
    }
  };

  const getToolIcon = (toolName?: string) => {
    switch (toolName) {
      case 'web-search':
        return <Search className="h-4 w-4 text-orange-500" />;
      case 'knowledge-search':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'github-tools':
        return <Code className="h-4 w-4 text-gray-600" />;
      case 'jira-tools':
        return <Settings className="h-4 w-4 text-blue-600" />;
      case 'web-scraper':
        return <Globe className="h-4 w-4 text-green-600" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBgColor = () => {
    switch (step.type) {
      case 'tool-announcement':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30';
      case 'partial-result':
        return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/30';
      case 'step-announcement':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30';
      case 'thinking':
        return 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800/30';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800/30';
    }
  };

  const getTextStyle = () => {
    switch (step.type) {
      case 'tool-announcement':
        return 'text-amber-800 dark:text-amber-200 font-mono text-sm';
      case 'partial-result':
        return 'text-green-800 dark:text-green-200 font-medium';
      case 'step-announcement':
        return 'text-blue-800 dark:text-blue-200 italic';
      case 'thinking':
        return 'text-purple-800 dark:text-purple-200 italic';
      default:
        return 'text-gray-800 dark:text-gray-200';
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
          <span className={`text-sm ${getTextStyle()}`}>
            {step.content}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StreamingMessage;
