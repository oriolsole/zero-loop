
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

  const getStatusColor = () => {
    switch (tool.status) {
      case 'completed':
        return 'bg-green-100 border-green-200';
      case 'failed':
        return 'bg-red-100 border-red-200';
      case 'executing':
        return 'bg-blue-100 border-blue-200';
      default:
        return 'bg-yellow-100 border-yellow-200';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{tool.displayName}</span>
        {tool.progress !== undefined && tool.status === 'executing' && (
          <Progress value={tool.progress} className="w-16 h-2" />
        )}
      </div>
    );
  }

  return (
    <Card className={`border ${getStatusColor()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">{tool.displayName}</span>
          </div>
          <Badge variant={tool.status === 'completed' ? 'default' : 'secondary'}>
            {tool.status}
          </Badge>
        </div>
        
        {tool.progress !== undefined && tool.status === 'executing' && (
          <div className="mb-2">
            <Progress value={tool.progress} className="w-full h-2" />
            <span className="text-xs text-muted-foreground mt-1">{tool.progress}%</span>
          </div>
        )}
        
        {tool.parameters && Object.keys(tool.parameters).length > 0 && (
          <div className="text-xs text-muted-foreground">
            <strong>Parameters:</strong> {JSON.stringify(tool.parameters, null, 1)}
          </div>
        )}
        
        {tool.error && (
          <div className="text-xs text-red-600 mt-2">
            <strong>Error:</strong> {tool.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ToolExecutionCard;
