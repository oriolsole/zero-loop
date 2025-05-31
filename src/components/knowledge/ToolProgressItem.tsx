
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolProgressItem as ToolProgressItemType } from './ToolProgressStream';

interface ToolProgressItemProps {
  tool: ToolProgressItemType;
  currentTime: Date;
  getToolIcon: (toolName: string) => React.ComponentType<{ className?: string }>;
  getStatusIcon: (status: ToolProgressItemType['status']) => React.ComponentType<{ className?: string }>;
  getStatusColor: (status: ToolProgressItemType['status']) => string;
  formatDuration: (startTime?: string, endTime?: string | Date) => string | null;
}

const ToolProgressItem: React.FC<ToolProgressItemProps> = ({
  tool,
  currentTime,
  getToolIcon,
  getStatusIcon,
  getStatusColor,
  formatDuration
}) => {
  const ToolIcon = getToolIcon(tool.name);
  const StatusIcon = getStatusIcon(tool.status);
  const statusColor = getStatusColor(tool.status);
  const duration = formatDuration(tool.startTime, tool.endTime);
  const isExecuting = tool.status === 'executing' || tool.status === 'starting';

  return (
    <div 
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
};

export default ToolProgressItem;
