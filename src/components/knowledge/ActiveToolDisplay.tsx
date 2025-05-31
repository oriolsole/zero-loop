
import React from 'react';
import { Loader2 } from 'lucide-react';
import { ToolProgressItem } from './ToolProgressStream';

interface ActiveToolDisplayProps {
  activeTool: ToolProgressItem;
}

const ActiveToolDisplay: React.FC<ActiveToolDisplayProps> = ({ activeTool }) => {
  return (
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
  );
};

export default ActiveToolDisplay;
