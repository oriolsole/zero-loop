
import React from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AtomicTool } from '@/types/tools';

interface AtomicToolCardProps {
  tool: AtomicTool;
}

const AtomicToolCard: React.FC<AtomicToolCardProps> = ({ tool }) => {
  const getStatusIcon = () => {
    switch (tool.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusStyle = () => {
    switch (tool.status) {
      case 'completed':
        return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/30';
      case 'failed':
        return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30';
    }
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm ${getStatusStyle()}`}>
      {getStatusIcon()}
      <span className="text-sm font-medium flex-1">{tool.displayName}</span>
      {tool.error && (
        <span className="text-xs text-red-600 dark:text-red-400">
          {tool.error}
        </span>
      )}
    </div>
  );
};

export default AtomicToolCard;
