
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ToolProgressItem } from '@/types/tools';
import { getToolIcon, getToolDisplayName, getToolColor } from '@/utils/toolIcons';

interface EnhancedToolCardProps {
  tool: ToolProgressItem;
  compact?: boolean;
}

const EnhancedToolCard: React.FC<EnhancedToolCardProps> = ({ tool, compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const ToolIcon = getToolIcon(tool.name);
  const displayName = getToolDisplayName(tool.name);
  const colorClass = getToolColor(tool.name);

  const getStatusIcon = () => {
    switch (tool.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'executing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    switch (tool.status) {
      case 'pending':
        return 'Pending...';
      case 'starting':
        return 'Starting...';
      case 'executing':
        return 'Running...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const hasDetails = tool.parameters || tool.result || tool.error;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm ${colorClass}`}>
        <ToolIcon className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{displayName}</span>
            {getStatusIcon()}
          </div>
          {tool.progress !== undefined && tool.status === 'executing' && (
            <div className="mt-1">
              <Progress value={tool.progress} className="w-full h-1" />
            </div>
          )}
        </div>
        <Badge variant="outline" className="text-xs">
          {getStatusText()}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border shadow-sm ${colorClass}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ToolIcon className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{displayName}</span>
                  {getStatusIcon()}
                </div>
                <div className="text-xs opacity-75 mt-1">
                  {getStatusText()}
                  {tool.startTime && (
                    <span className="ml-2">
                      Started {new Date(tool.startTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {tool.status}
              </Badge>
              {hasDetails && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>
          
          {tool.progress !== undefined && tool.status === 'executing' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs opacity-75 mb-1">
                <span>Progress</span>
                <span>{tool.progress}%</span>
              </div>
              <Progress value={tool.progress} className="w-full h-2" />
            </div>
          )}
        </div>

        {hasDetails && (
          <CollapsibleContent>
            <div className="border-t px-4 pb-4 pt-3 space-y-3">
              {tool.parameters && Object.keys(tool.parameters).length > 0 && (
                <div className="bg-background/50 p-3 rounded-lg">
                  <div className="text-xs font-medium mb-2 opacity-75">Parameters</div>
                  <pre className="text-xs opacity-75 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(tool.parameters, null, 2)}
                  </pre>
                </div>
              )}
              
              {tool.result && (
                <div className="bg-background/50 p-3 rounded-lg">
                  <div className="text-xs font-medium mb-2 opacity-75">Result</div>
                  <div className="text-xs opacity-75">
                    {typeof tool.result === 'string' ? (
                      <p className="whitespace-pre-wrap">{tool.result}</p>
                    ) : (
                      <pre className="whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(tool.result, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
              
              {tool.error && (
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800/30">
                  <div className="text-xs font-medium mb-2 text-red-600 dark:text-red-400">Error</div>
                  <p className="text-xs text-red-600 dark:text-red-400">{tool.error}</p>
                </div>
              )}
              
              {tool.endTime && (
                <div className="text-xs opacity-75">
                  Completed at {new Date(tool.endTime).toLocaleTimeString()}
                  {tool.startTime && (
                    <span className="ml-2">
                      (Duration: {Math.round((new Date(tool.endTime).getTime() - new Date(tool.startTime).getTime()) / 1000)}s)
                    </span>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
};

export default EnhancedToolCard;
