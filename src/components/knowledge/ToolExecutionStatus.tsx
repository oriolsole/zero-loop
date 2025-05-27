
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2, Clock, Settings, Search, Database, Github, Globe, Code } from 'lucide-react';
import { ToolProgressItem } from '@/types/tools';

interface ToolExecutionStatusProps {
  tool: ToolProgressItem;
  showResult?: boolean;
}

const ToolExecutionStatus: React.FC<ToolExecutionStatusProps> = ({ tool, showResult = false }) => {
  const getStatusIcon = () => {
    switch (tool.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'executing':
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'web-search':
      case 'execute_web_search':
        return <Search className="h-3 w-3 text-blue-400" />;
      case 'knowledge-search':
      case 'knowledge_retrieval':
        return <Database className="h-3 w-3 text-purple-400" />;
      case 'github-tools':
        return <Github className="h-3 w-3 text-gray-400" />;
      case 'web-scraper':
        return <Globe className="h-3 w-3 text-green-400" />;
      case 'code-analysis':
        return <Code className="h-3 w-3 text-orange-400" />;
      default:
        return <Settings className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (tool.status) {
      case 'completed':
        return 'bg-green-950/20 border-green-800/30';
      case 'failed':
        return 'bg-red-950/20 border-red-800/30';
      case 'executing':
        return 'bg-blue-950/20 border-blue-800/30';
      default:
        return 'bg-yellow-950/20 border-yellow-800/30';
    }
  };

  const formatResult = (result: any) => {
    if (typeof result === 'string') {
      return result.length > 200 ? `${result.substring(0, 200)}...` : result;
    }
    return JSON.stringify(result, null, 2);
  };

  return (
    <div className={`rounded-xl border p-3 shadow-sm ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getToolIcon(tool.name)}
          <span className="text-sm font-medium text-foreground">{tool.displayName}</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <Badge 
            variant={tool.status === 'completed' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {tool.status}
          </Badge>
        </div>
      </div>
      
      {tool.progress !== undefined && tool.status === 'executing' && (
        <div className="mb-2">
          <Progress value={tool.progress} className="w-full h-1.5" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Progress</span>
            <span>{tool.progress}%</span>
          </div>
        </div>
      )}
      
      {tool.parameters && Object.keys(tool.parameters).length > 0 && (
        <div className="text-xs text-muted-foreground bg-secondary/20 p-2 rounded-lg mb-2">
          <strong>Input:</strong> {JSON.stringify(tool.parameters, null, 1)}
        </div>
      )}
      
      {showResult && tool.result && (
        <div className="text-xs text-foreground bg-secondary/20 p-2 rounded-lg mb-2 max-h-24 overflow-y-auto">
          <strong>Result:</strong> {formatResult(tool.result)}
        </div>
      )}
      
      {tool.error && (
        <div className="text-xs text-red-400 bg-red-950/20 p-2 rounded-lg">
          <strong>Error:</strong> {tool.error}
        </div>
      )}
    </div>
  );
};

export default ToolExecutionStatus;
