import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ToolProgressItem } from '@/types/tools';
import { getToolIcon, getToolDisplayName } from '@/utils/toolIcons';
interface EnhancedToolCardProps {
  tool: ToolProgressItem;
  compact?: boolean;
}
const EnhancedToolCard: React.FC<EnhancedToolCardProps> = ({
  tool,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(tool.status);
  const ToolIcon = getToolIcon(tool.name);
  const displayName = getToolDisplayName(tool.name);

  // Auto-expand when tool completes or fails (but only once per status change)
  useEffect(() => {
    if (previousStatus !== tool.status && (tool.status === 'completed' || tool.status === 'failed')) {
      setIsExpanded(true);
      setPreviousStatus(tool.status);
    }
  }, [tool.status, previousStatus]);
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
  const getStatusColor = () => {
    switch (tool.status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'executing':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };
  const hasDetails = tool.parameters || tool.result || tool.error;
  if (compact) {
    return <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
        <ToolIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground truncate">{displayName}</span>
            {getStatusIcon()}
          </div>
        </div>
        <Badge variant="outline" className={`text-xs border-muted-foreground/30 ${getStatusColor()}`}>
          {getStatusText()}
        </Badge>
      </div>;
  }
  return <div className="rounded-lg border border-border/30 bg-muted/20 shadow-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ToolIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{displayName}</span>
                  {getStatusIcon()}
                </div>
                <div className="text-xs text-muted-foreground/70 mt-1">
                  <span className={getStatusColor()}>{getStatusText()}</span>
                  {tool.startTime && <span className="ml-2">
                      Started {new Date(tool.startTime).toLocaleTimeString()}
                    </span>}
                  {tool.endTime && tool.startTime && <span className="ml-2">
                      (Duration: {Math.round((new Date(tool.endTime).getTime() - new Date(tool.startTime).getTime()) / 1000)}s)
                    </span>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs border-muted-foreground/30 ${getStatusColor()}`}>
                {tool.status}
              </Badge>
              {hasDetails && <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </Button>
                </CollapsibleTrigger>}
            </div>
          </div>
        </div>

        {hasDetails && <CollapsibleContent>
            <div className="border-t border-border/30 px-3 pb-3 pt-2 space-y-3">
              {/* Parameters Section - Always shown if available */}
              {tool.parameters && Object.keys(tool.parameters).length > 0 && <div className="bg-muted/20 p-3 rounded border border-border/20">
                  <div className="text-xs font-medium mb-2 text-muted-foreground/90 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Query Parameters
                  </div>
                  <pre className="text-xs text-muted-foreground/80 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(tool.parameters, null, 2)}
                  </pre>
                </div>}
              
              {/* Results Section - Only shown when completed */}
              {tool.result && tool.status === 'completed' && <div className="p-3 rounded border border-green-200 dark:border-green-800/30 bg-zinc-800">
                  <div className="text-xs font-medium mb-2 text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Results
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-400">
                    {typeof tool.result === 'string' ? <p className="whitespace-pre-wrap">{tool.result}</p> : <pre className="whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(tool.result, null, 2)}
                      </pre>}
                  </div>
                </div>}
              
              {/* Error Section - Only shown when failed */}
              {tool.error && tool.status === 'failed' && <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200 dark:border-red-800/30">
                  <div className="text-xs font-medium mb-2 text-red-600 dark:text-red-400 flex items-center gap-2">
                    <XCircle className="h-3 w-3" />
                    Error
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400">{tool.error}</p>
                </div>}
              
              {/* Executing State Info */}
              {tool.status === 'executing' && <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-800/30">
                  <div className="text-xs font-medium mb-1 text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Executing...
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Tool is currently running with the parameters shown above.
                  </p>
                </div>}
            </div>
          </CollapsibleContent>}
      </Collapsible>
    </div>;
};
export default EnhancedToolCard;