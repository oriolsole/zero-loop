
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Bot, Loader2, Search, Database, Github, Globe, Settings } from 'lucide-react';

interface WorkingMessageProps {
  currentStep: string;
  toolsUsed?: string[];
  progress?: number;
}

const WorkingMessage: React.FC<WorkingMessageProps> = ({
  currentStep,
  toolsUsed = [],
  progress = 0
}) => {
  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'web-search':
        return <Search className="h-3 w-3 text-blue-500" />;
      case 'knowledge-search':
        return <Database className="h-3 w-3 text-purple-500" />;
      case 'github-tools':
        return <Github className="h-3 w-3 text-gray-600" />;
      case 'web-scraper':
        return <Globe className="h-3 w-3 text-green-600" />;
      default:
        return <Settings className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <div className="flex gap-3 justify-start animate-fade-in">
      <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className="rounded-2xl px-5 py-4 max-w-[75%] bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30 mr-16 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          <span className="text-sm text-blue-800 dark:text-blue-200">
            {currentStep}
          </span>
        </div>
        
        {toolsUsed.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-medium">
              Tools in use:
            </div>
            <div className="flex flex-wrap gap-2">
              {toolsUsed.map((tool, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-md text-xs text-blue-700 dark:text-blue-300"
                >
                  {getToolIcon(tool)}
                  <span>{tool.replace(/-/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {progress > 0 && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-blue-600 dark:text-blue-400 text-right">
              {progress}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkingMessage;
