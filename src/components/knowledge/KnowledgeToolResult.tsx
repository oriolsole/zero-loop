
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
    const result = tool.result || {};
    const nodeId = result.nodeId;
    const persistenceStatus = result.persistenceStatus || (result.success ? 'persisted' : 'failed');
    const originalQuery = tool.parameters?.query || tool.parameters?.originalMessage;
    
    // Extract insight data - handle both string and object formats
    let insightData = null;
    let insightText = '';
    
    if (result.insights) {
      if (typeof result.insights === 'string') {
        try {
          insightData = JSON.parse(result.insights);
          insightText = result.insights;
        } catch {
          insightText = result.insights;
        }
      } else if (typeof result.insights === 'object') {
        insightData = result.insights;
        insightText = JSON.stringify(result.insights, null, 2);
      }
    }
    
    // Extract metadata
    const complexity = result.complexity || tool.parameters?.complexity || 'unknown';
    const iterations = result.iterations || result.iterationCount || 1;
    const toolsUsed = result.toolsUsed || result.toolsInvolved || [];
    const confidence = insightData?.confidence;
    const insightType = insightData?.type;
    const domain = insightData?.domain || result.domain;

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
          <div className="flex items-center gap-2">
            {insightType && (
              <Badge variant="outline" className="text-xs">
                {insightType}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {complexity} complexity
            </Badge>
          </div>
        </div>

        <div className="bg-secondary/30 p-3 rounded-lg border border-border space-y-3">
          {/* Original Query */}
          {originalQuery && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Original Query:</div>
              <div className="text-sm text-foreground bg-background/50 p-2 rounded border">
                {originalQuery}
              </div>
            </div>
          )}

          {/* Node Information */}
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <span className="font-medium text-muted-foreground">Node ID: </span>
              <span className="font-mono">{nodeId || 'Not generated'}</span>
            </div>
            <div className="text-xs">
              <span className="font-medium text-muted-foreground">Iterations: </span>
              <span>{iterations}</span>
            </div>
          </div>

          {/* Insight Details */}
          {insightData && (
            <div className="space-y-2">
              {insightData.title && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Insight Title:</div>
                  <div className="text-sm font-medium text-foreground">{insightData.title}</div>
                </div>
              )}
              
              {insightData.description && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Description:</div>
                  <div className="text-sm text-foreground">{insightData.description}</div>
                </div>
              )}

              <div className="flex items-center gap-4">
                {confidence && (
                  <div className="text-xs">
                    <span className="font-medium text-muted-foreground">Confidence: </span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(confidence * 100)}%
                    </Badge>
                  </div>
                )}
                {domain && (
                  <div className="text-xs">
                    <span className="font-medium text-muted-foreground">Domain: </span>
                    <span>{domain}</span>
                  </div>
                )}
              </div>

              {insightData.tags && insightData.tags.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Tags:</div>
                  <div className="flex flex-wrap gap-1">
                    {insightData.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {insightData.reasoning && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Reasoning:</div>
                  <div className="text-sm text-foreground italic">{insightData.reasoning}</div>
                </div>
              )}
            </div>
          )}

          {/* Tools Used */}
          {toolsUsed.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Tools Used:</div>
              <div className="flex flex-wrap gap-1">
                {toolsUsed.map((tool: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Copy Actions */}
          <div className="flex gap-2 pt-2 border-t border-border">
            {insightText && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 p-1 text-xs"
                onClick={() => copyToClipboard(insightText, 'Learning insights')}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Insights
              </Button>
            )}
            {originalQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 p-1 text-xs"
                onClick={() => copyToClipboard(originalQuery, 'Original query')}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Query
              </Button>
            )}
          </div>
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
