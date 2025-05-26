
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  Search, 
  Database, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Zap,
  ArrowRight,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolProgressItem {
  id: string;
  name: string;
  displayName: string;
  status: 'pending' | 'starting' | 'executing' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  progress?: number;
  estimatedDuration?: number;
}

interface ToolProgressStreamProps {
  tools: ToolProgressItem[];
  isActive: boolean;
  className?: string;
}

const getToolIcon = (toolName: string) => {
  if (toolName.includes('search') || toolName.includes('web')) return Search;
  if (toolName.includes('github') || toolName.includes('code')) return Code;
  if (toolName.includes('knowledge') || toolName.includes('database')) return Database;
  return Bot;
};

const getStatusIcon = (status: ToolProgressItem['status']) => {
  switch (status) {
    case 'pending':
      return Clock;
    case 'starting':
    case 'executing':
      return Loader2;
    case 'completed':
      return CheckCircle;
    case 'failed':
      return XCircle;
    default:
      return Clock;
  }
};

const getStatusColor = (status: ToolProgressItem['status']) => {
  switch (status) {
    case 'pending':
      return 'text-muted-foreground';
    case 'starting':
    case 'executing':
      return 'text-blue-500';
    case 'completed':
      return 'text-green-500';
    case 'failed':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
};

const formatDuration = (startTime?: string, endTime?: string) => {
  if (!startTime) return null;
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const duration = Math.round((end.getTime() - start.getTime()) / 1000 * 100) / 100;
  return `${duration}s`;
};

const ToolProgressStream: React.FC<ToolProgressStreamProps> = ({
  tools,
  isActive,
  className
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time for live duration display
  useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  if (tools.length === 0) return null;

  const activeTool = tools.find(t => t.status === 'executing' || t.status === 'starting');
  const completedTools = tools.filter(t => t.status === 'completed').length;
  const totalProgress = tools.length > 0 ? (completedTools / tools.length) * 100 : 0;

  return (
    <Card className={cn(
      "mt-3 border-l-4 transition-all duration-300",
      isActive ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20" : "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
      className
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with overall progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isActive ? "Tools in Progress" : "Tools Completed"}
              </span>
              <Badge variant="secondary" className="text-xs">
                {completedTools}/{tools.length}
              </Badge>
            </div>
            {isActive && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                Working...
              </div>
            )}
          </div>

          {/* Overall progress bar */}
          <Progress value={totalProgress} className="h-2" />

          {/* Individual tool progress */}
          <div className="space-y-2">
            {tools.map((tool, index) => {
              const ToolIcon = getToolIcon(tool.name);
              const StatusIcon = getStatusIcon(tool.status);
              const statusColor = getStatusColor(tool.status);
              const duration = formatDuration(tool.startTime, tool.endTime);
              const isExecuting = tool.status === 'executing' || tool.status === 'starting';

              return (
                <div 
                  key={tool.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-all duration-300",
                    isExecuting && "bg-blue-100/50 dark:bg-blue-900/20",
                    tool.status === 'completed' && "bg-green-100/50 dark:bg-green-900/20",
                    tool.status === 'failed' && "bg-red-100/50 dark:bg-red-900/20"
                  )}
                >
                  {/* Tool icon */}
                  <ToolIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  
                  {/* Status icon with animation */}
                  <StatusIcon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    statusColor,
                    isExecuting && "animate-spin"
                  )} />
                  
                  {/* Tool info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {tool.displayName}
                      </span>
                      {tool.parameters && Object.keys(tool.parameters).length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {Object.keys(tool.parameters).join(', ')}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Status and timing */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{tool.status}</span>
                      {duration && (
                        <>
                          <ArrowRight className="h-3 w-3" />
                          <span>{duration}</span>
                        </>
                      )}
                      {tool.status === 'executing' && tool.startTime && (
                        <>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-blue-600 font-medium">
                            {formatDuration(tool.startTime, currentTime.toISOString())}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Tool-specific progress bar */}
                    {isExecuting && tool.progress !== undefined && (
                      <Progress value={tool.progress} className="h-1 mt-1" />
                    )}

                    {/* Error display */}
                    {tool.status === 'failed' && tool.error && (
                      <div className="text-xs text-red-600 mt-1 p-1 bg-red-50 dark:bg-red-950/30 rounded">
                        {tool.error}
                      </div>
                    )}

                    {/* Result preview */}
                    {tool.status === 'completed' && tool.result && (
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1 p-1 bg-green-50 dark:bg-green-950/30 rounded">
                        ✓ Result available
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active tool details */}
          {activeTool && (
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="font-medium">Currently executing: {activeTool.displayName}</span>
              </div>
              {activeTool.parameters && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Parameters: {JSON.stringify(activeTool.parameters, null, 0)}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ToolProgressStream;
