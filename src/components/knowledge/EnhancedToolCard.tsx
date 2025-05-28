
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
        <ToolIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground truncate">{displayName}</span>
            {getStatusIcon()}
          </div>
        </div>
        <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
          {getStatusText()}
        </Badge>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 shadow-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ToolIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-muted-foreground">{displayName}</span>
                  {getStatusIcon()}
                </div>
                <div className="text-xs text-muted-foreground/70 mt-1">
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
              <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
                {tool.status}
              </Badge>
              {hasDetails && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>
        </div>

        {hasDetails && (
          <CollapsibleContent>
            <div className="border-t border-border/30 px-3 pb-3 pt-2 space-y-2">
              {tool.parameters && Object.keys(tool.parameters).length > 0 && (
                <div className="bg-muted/30 p-2 rounded border border-border/30">
                  <div className="text-xs font-medium mb-1 text-muted-foreground/90">Parameters</div>
                  <pre className="text-xs text-muted-foreground/80 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(tool.parameters, null, 2)}
                  </pre>
                </div>
              )}
              
              {tool.result && (
                <div className="bg-muted/30 p-2 rounded border border-border/30">
                  <div className="text-xs font-medium mb-1 text-muted-foreground/90">Result</div>
                  <div className="text-xs text-muted-foreground/80">
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
                <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800/30">
                  <div className="text-xs font-medium mb-1 text-red-600 dark:text-red-400">Error</div>
                  <p className="text-xs text-red-600 dark:text-red-400">{tool.error}</p>
                </div>
              )}
              
              {tool.endTime && (
                <div className="text-xs text-muted-foreground/70">
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
