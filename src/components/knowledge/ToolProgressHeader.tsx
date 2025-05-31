
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap } from 'lucide-react';

interface ToolProgressHeaderProps {
  isActive: boolean;
  completedTools: number;
  totalTools: number;
}

const ToolProgressHeader: React.FC<ToolProgressHeaderProps> = ({
  isActive,
  completedTools,
  totalTools
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4" />
        <span className="text-sm font-medium">
          {isActive ? "Tools in Progress" : "Tools Completed"}
        </span>
        <Badge variant="secondary" className="text-xs">
          {completedTools}/{totalTools}
        </Badge>
      </div>
      {isActive && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="h-3 w-3" />
          Working...
        </div>
      )}
    </div>
  );
};

export default ToolProgressHeader;
