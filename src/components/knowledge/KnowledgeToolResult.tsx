
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Lightbulb, ExternalLink, Copy } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface KnowledgeSource {
  id?: string;
  title: string;
  snippet: string;
  relevanceScore?: number;
  sourceType?: string;
  nodeType?: string;
  metadata?: any;
}

interface KnowledgeToolResultProps {
  tool: {
    name: string;
    parameters: any;
    result: any;
    success: boolean;
  };
}

const KnowledgeToolResult: React.FC<KnowledgeToolResultProps> = ({ tool }) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const renderKnowledgeRetrievalResult = () => {
    const sources = tool.result?.sources || [];
    const searchType = tool.result?.searchType || 'unknown';
    const totalResults = tool.result?.totalResults || 0;
    const returnedResults = tool.result?.returnedResults || 0;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm">Knowledge Base Search</span>
            <Badge variant="secondary" className="text-xs">
              {searchType}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {returnedResults} of {totalResults} results
          </div>
        </div>

        {tool.result?.message && (
          <div className="text-sm text-muted-foreground italic">
            {tool.result.message}
          </div>
        )}

        {sources.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Knowledge Sources:
            </div>
            {sources.map((source: KnowledgeSource, idx: number) => (
              <div key={idx} className="bg-secondary/30 p-3 rounded-lg border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{source.title}</div>
                    {source.sourceType && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {source.sourceType} {source.nodeType && `(${source.nodeType})`}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {source.relevanceScore && (
                      <Badge variant="secondary" className="text-xs">
                        {(source.relevanceScore * 100).toFixed(1)}%
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(source.snippet, 'Knowledge snippet')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {source.snippet}
                </div>
                {source.metadata?.fileUrl && (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 p-1 text-xs"
                      onClick={() => window.open(source.metadata.fileUrl, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Source
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderLearningGenerationResult = () => {
    const nodeId = tool.result?.nodeId;
    const insights = tool.result?.insights;
    const complexity = tool.result?.complexity;
    const iterations = tool.result?.iterations;
    const persistenceStatus = tool.result?.persistenceStatus;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="font-medium text-sm">Learning Generation</span>
            <Badge variant={persistenceStatus === 'persisted' ? 'default' : 'destructive'} className="text-xs">
              {persistenceStatus}
            </Badge>
          </div>
          {complexity && (
            <Badge variant="secondary" className="text-xs">
              {complexity} complexity
            </Badge>
          )}
        </div>

        <div className="bg-secondary/30 p-3 rounded-lg border border-border space-y-2">
          {nodeId && (
            <div className="text-xs">
              <span className="font-medium text-muted-foreground">Node ID: </span>
              <span className="font-mono">{nodeId}</span>
            </div>
          )}
          
          {iterations && (
            <div className="text-xs">
              <span className="font-medium text-muted-foreground">Iterations: </span>
              <span>{iterations}</span>
            </div>
          )}

          {insights && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Generated Insights:</div>
              <div className="text-sm text-foreground">
                {typeof insights === 'string' ? insights : JSON.stringify(insights, null, 2)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 p-1 text-xs mt-2"
                onClick={() => copyToClipboard(
                  typeof insights === 'string' ? insights : JSON.stringify(insights, null, 2),
                  'Learning insights'
                )}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Insights
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (tool.name === 'knowledge_retrieval') {
    return renderKnowledgeRetrievalResult();
  }

  if (tool.name === 'learning_generation') {
    return renderLearningGenerationResult();
  }

  return null;
};

export default KnowledgeToolResult;
