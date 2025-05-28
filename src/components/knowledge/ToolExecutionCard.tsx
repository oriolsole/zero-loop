
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { ToolProgressItem } from '@/types/tools';

interface ToolExecutionCardProps {
  tool: ToolProgressItem;
  compact?: boolean;
}

const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({ tool, compact = false }) => {
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

  const getStatusStyle = () => {
    switch (tool.status) {
      case 'completed':
        return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/30';
      case 'failed':
        return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30';
      case 'executing':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30';
      default:
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800/30';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm ${getStatusStyle()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium flex-1">{tool.displayName}</span>
        {tool.progress !== undefined && tool.status === 'executing' && (
          <div className="flex items-center gap-2">
            <Progress value={tool.progress} className="w-20 h-2" />
            <span className="text-xs text-muted-foreground min-w-[2rem] text-right">
              {tool.progress}%
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={`border shadow-sm ${getStatusStyle()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <span className="font-medium">{tool.displayName}</span>
          </div>
          <Badge 
            variant={tool.status === 'completed' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {tool.status}
          </Badge>
        </div>
        
        {tool.progress !== undefined && tool.status === 'executing' && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{tool.progress}%</span>
            </div>
            <Progress value={tool.progress} className="w-full h-2" />
          </div>
        )}
        
        {tool.parameters && Object.keys(tool.parameters).length > 0 && (
          <div className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg">
            <strong>Parameters:</strong> {JSON.stringify(tool.parameters, null, 1)}
          </div>
        )}
        
        {tool.error && (
          <div className="text-xs text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-950/20 p-2 rounded-lg">
            <strong>Error:</strong> {tool.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ToolExecutionCard;
