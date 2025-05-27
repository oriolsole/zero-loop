
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Bot, Loader2, Search, Database, Github, Globe, Code } from 'lucide-react';

interface WorkingMessageProps {
  currentTool?: string;
  progress?: number;
  status: string;
  isAnimated?: boolean;
}

const WorkingMessage: React.FC<WorkingMessageProps> = ({ 
  currentTool, 
  progress, 
  status,
  isAnimated = true 
}) => {
  const getToolIcon = (toolName?: string) => {
    switch (toolName) {
      case 'web-search':
      case 'execute_web-search':
        return <Search className="h-4 w-4 text-orange-400" />;
      case 'knowledge-search':
      case 'knowledge_retrieval':
        return <Database className="h-4 w-4 text-purple-400" />;
      case 'github-tools':
      case 'execute_github-tools':
        return <Github className="h-4 w-4 text-gray-400" />;
      case 'web-scraper':
      case 'execute_web-scraper':
        return <Globe className="h-4 w-4 text-green-400" />;
      case 'code-analysis':
        return <Code className="h-4 w-4 text-orange-400" />;
      default:
        return <Bot className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="flex gap-3 justify-start animate-fade-in">
      <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
        <AvatarFallback className="bg-secondary/60 border border-border/30">
          {isAnimated ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Bot className="h-4 w-4 text-primary" />
          )}
        </AvatarFallback>
      </Avatar>
      
      <div className="bg-secondary/40 border border-border/30 rounded-lg px-4 py-3 max-w-[75%] min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          {getToolIcon(currentTool)}
          <span className="text-sm font-medium text-foreground">
            {status}
          </span>
        </div>
        
        {currentTool && (
          <div className="text-xs text-muted-foreground mb-2">
            Using: {currentTool.replace('execute_', '').replace(/_/g, ' ')}
          </div>
        )}
        
        {progress !== undefined && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground text-right">
              {progress}%
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-1 mt-2">
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
};

export default WorkingMessage;
