
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, CheckCircle, Settings, Search, Database, Github, Globe, Code, Brain } from 'lucide-react';

interface ThinkingMessageProps {
  type: 'step-announcement' | 'partial-result' | 'tool-announcement';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolAction?: string;
}

const ThinkingMessage: React.FC<ThinkingMessageProps> = ({ 
  type, 
  content, 
  timestamp, 
  toolName, 
  toolAction 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'tool-announcement':
        return getToolIcon(toolName);
      case 'partial-result':
        return <CheckCircle className="h-3 w-3 text-green-400" />;
      case 'step-announcement':
        return <Brain className="h-3 w-3 text-blue-400" />;
      default:
        return <Bot className="h-3 w-3 text-gray-400" />;
    }
  };

  const getToolIcon = (toolName?: string) => {
    switch (toolName) {
      case 'web-search':
      case 'execute_web-search':
        return <Search className="h-3 w-3 text-orange-400" />;
      case 'knowledge-search':
      case 'knowledge_retrieval':
        return <Database className="h-3 w-3 text-purple-400" />;
      case 'github-tools':
      case 'execute_github-tools':
        return <Github className="h-3 w-3 text-gray-400" />;
      case 'web-scraper':
      case 'execute_web-scraper':
        return <Globe className="h-3 w-3 text-green-400" />;
      case 'code-analysis':
        return <Code className="h-3 w-3 text-orange-400" />;
      default:
        return <Settings className="h-3 w-3 text-gray-400" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'tool-announcement':
        return 'bg-amber-950/20 border-amber-800/30';
      case 'partial-result':
        return 'bg-green-950/20 border-green-800/30';
      case 'step-announcement':
        return 'bg-blue-950/20 border-blue-800/30';
      default:
        return 'bg-gray-950/20 border-gray-800/30';
    }
  };

  const getTextStyle = () => {
    switch (type) {
      case 'tool-announcement':
        return 'text-amber-200 font-mono text-sm';
      case 'partial-result':
        return 'text-green-200 font-medium text-sm';
      case 'step-announcement':
        return 'text-blue-200 italic text-sm';
      default:
        return 'text-gray-200 text-sm';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex gap-3 justify-start animate-fade-in">
      <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
        <AvatarFallback className="bg-secondary/60 border border-border/30">
          <Bot className="h-3 w-3 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      
      <div className={`rounded-lg px-3 py-2 max-w-[75%] border shadow-sm ${getBgColor()}`}>
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className={getTextStyle()}>
            {content}
          </span>
        </div>
        <div className="text-xs opacity-60 mt-1 text-right">
          {formatTimestamp(timestamp)}
        </div>
      </div>
    </div>
  );
};

export default ThinkingMessage;
