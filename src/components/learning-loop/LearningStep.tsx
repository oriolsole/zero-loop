
import React, { useState } from 'react';
import { LearningStep as LearningStepType } from '@/types/intelligence';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertTriangle, XCircle, Globe, Database, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ExternalSources from '@/components/ExternalSources';

interface LearningStepProps {
  step: LearningStepType;
  index: number;
}

const LearningStep: React.FC<LearningStepProps> = ({ step, index }) => {
  const [showSources, setShowSources] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Check if step has external sources in its metadata
  const hasSources = step.metadata?.sources && step.metadata.sources.length > 0;
  const sourceCount = hasSources ? step.metadata?.sources?.length : 0;
  
  // Determine source type (web, knowledge base, or both)
  const hasWebSources = hasSources && step.metadata?.sources?.some(
    source => source.sourceType === 'web'
  );
  const hasKbSources = hasSources && step.metadata?.sources?.some(
    source => source.sourceType === 'knowledge'
  );
  
  // Status indicator with appropriate icon and color
  const renderStatusIndicator = () => {
    switch (step.status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failure':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'pending':
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  // Badge variant based on step type
  const getBadgeVariant = () => {
    switch (step.type) {
      case 'task':
        return 'default';
      case 'solution':
        return 'secondary';
      case 'verification':
        return 'outline';
      case 'reflection':
        return 'destructive';
      case 'mutation':
        return 'purple';
      default:
        return 'default';
    }
  };

  return (
    <Card className={`p-4 mb-4 transition-opacity ${step.status === 'pending' ? 'opacity-50' : 'opacity-100'}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={getBadgeVariant()} className="capitalize">
            {step.type}
          </Badge>
          <h3 className="font-semibold">{step.title}</h3>
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowDetails(!showDetails)}>
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View step details and debug info</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <span className="text-xs text-muted-foreground mr-1">Status:</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{renderStatusIndicator()}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="capitalize">Status: {step.status}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {showDetails && (
        <div className="mb-3 p-2 bg-muted/30 rounded-md text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="font-medium">ID:</span> {step.id}</div>
            <div><span className="font-medium">Type:</span> {step.type}</div>
            <div><span className="font-medium">Status:</span> {step.status}</div>
            <div><span className="font-medium">Index:</span> {index}</div>
            {step.metrics && Object.entries(step.metrics).map(([key, value]) => (
              <div key={key}><span className="font-medium">{key}:</span> {String(value)}</div>
            ))}
          </div>
        </div>
      )}

      <div className="prose prose-sm max-w-none dark:prose-invert">
        {step.status === 'pending' ? (
          <div className="flex items-center gap-2 py-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{step.content}</div>
        )}
      </div>
      
      {hasSources && (
        <div className="mt-3 border-t border-border pt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              This step used {sourceCount} external source{sourceCount > 1 ? 's' : ''}.
              {hasWebSources && hasKbSources && " (Web and Knowledge Base)"}
              {hasWebSources && !hasKbSources && " (Web only)"}
              {!hasWebSources && hasKbSources && " (Knowledge Base only)"}
            </p>
            
            <div className="flex gap-2">
              {hasKbSources && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-blue-500">
                        <Database className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Used internal knowledge base sources</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {hasWebSources && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-green-500">
                        <Globe className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Used web knowledge sources</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => setShowSources(!showSources)}
              >
                {showSources ? 'Hide Sources' : 'Show Sources'}
              </Button>
            </div>
          </div>
          
          {showSources && (
            <div className="mt-3">
              <ExternalSources 
                sources={step.metadata?.sources || []}
                title="Knowledge Sources"
                description="Sources used to enhance this reasoning step"
                maxHeight="200px"
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default LearningStep;
