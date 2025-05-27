
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Bot, Loader2, Settings, Search, Database, Github, Globe, Code } from 'lucide-react';

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
        return <Search className="h-4 w-4 text-blue-400" />;
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
        return <Settings className="h-4 w-4 text-gray-400" />;
    }
  };

  const getToolDisplayName = (toolName?: string) => {
    switch (toolName) {
      case 'web-search':
      case 'execute_web-search':
        return 'Web Search';
      case 'knowledge-search':
      case 'knowledge_retrieval':
        return 'Knowledge Search';
      case 'github-tools':
      case 'execute_github-tools':
        return 'GitHub Analysis';
      case 'web-scraper':
      case 'execute_web-scraper':
        return 'Web Scraping';
      case 'code-analysis':
        return 'Code Analysis';
      default:
        return toolName ? toolName.replace(/_/g, ' ').replace(/^execute[_-]/, '') : 'Processing';
    }
  };

  return (
    <div className="flex gap-3 justify-start animate-fade-in">
      <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
        <AvatarFallback className="bg-muted/80 border border-border/50">
          <Bot className="h-4 w-4 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      
      <div className="bg-muted/40 border border-border/50 rounded-xl px-4 py-3 max-w-[80%] shadow-sm">
        <div className="flex items-center gap-3">
          {currentTool && getToolIcon(currentTool)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isAnimated && <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />}
              <span className="text-sm text-foreground font-medium">
                {currentTool ? getToolDisplayName(currentTool) : 'Working'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              {status}
            </p>
            {progress !== undefined && progress > 0 && (
              <div className="mt-2">
                <Progress value={progress} className="w-32 h-1.5" />
                <span className="text-xs text-muted-foreground mt-1">{progress}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkingMessage;
