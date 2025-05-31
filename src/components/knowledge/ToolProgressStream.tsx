
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Database, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ToolProgressHeader from './ToolProgressHeader';
import ToolProgressBar from './ToolProgressBar';
import ToolProgressItem from './ToolProgressItem';
import ActiveToolDisplay from './ActiveToolDisplay';

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
  return Database;
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

const formatDuration = (startTime?: string, endTime?: string | Date) => {
  if (!startTime) return null;
  const start = new Date(startTime);
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime || new Date();
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
          <ToolProgressHeader 
            isActive={isActive}
            completedTools={completedTools}
            totalTools={tools.length}
          />

          <ToolProgressBar value={totalProgress} />

          {/* Individual tool progress */}
          <div className="space-y-2">
            {tools.map((tool) => (
              <ToolProgressItem
                key={tool.id}
                tool={tool}
                currentTime={currentTime}
                getToolIcon={getToolIcon}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
                formatDuration={formatDuration}
              />
            ))}
          </div>

          {/* Active tool details */}
          {activeTool && <ActiveToolDisplay activeTool={activeTool} />}
        </div>
      </CardContent>
    </Card>
  );
};

export default ToolProgressStream;
