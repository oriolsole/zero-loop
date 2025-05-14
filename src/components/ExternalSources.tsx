
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Globe, Link, Save, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ExternalSource } from '@/types/intelligence';
import { cn } from '@/lib/utils';

interface ExternalSourcesProps {
  sources: ExternalSource[];
  title?: string;
  description?: string;
  maxHeight?: string | number;
  showSaveButton?: boolean;
  onSaveResult?: (source: ExternalSource) => void;
}

const ExternalSources: React.FC<ExternalSourcesProps> = ({ 
  sources, 
  title = "External Sources", 
  description = "Information retrieved from external knowledge sources",
  maxHeight = "300px",
  showSaveButton = false,
  onSaveResult,
}) => {
  if (!sources || sources.length === 0) {
    return null;
  }
  
  return (
    <Card className="mt-4 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <div className="relative" style={{ 
        maxHeight: maxHeight,
        height: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight
      }}>
        <ScrollArea className="h-full w-full">
          <CardContent className="space-y-4 pb-6 px-6">
            {sources.map((source, index) => (
              <div key={index} className="space-y-2">
                {index > 0 && <Separator className="my-3" />}
                
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-sm">{source.title}</h4>
                  <div className="flex gap-1">
                    {/* Show source type badge */}
                    {source.sourceType && (
                      <Badge 
                        variant={source.sourceType === 'knowledge' ? 'secondary' : 'default'} 
                        className={cn(
                          "text-xs flex items-center gap-1",
                          source.sourceType === 'web' && "bg-blue-500 hover:bg-blue-600"
                        )}
                      >
                        {source.sourceType === 'knowledge' ? (
                          <>
                            <Database className="h-3 w-3" />
                            Knowledge Base
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3" />
                            Web
                          </>
                        )}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {source.source}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">{source.snippet}</p>
                
                <div className="flex justify-between items-center">
                  {source.link && (
                    <a 
                      href={source.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Source
                    </a>
                  )}
                  
                  {source.date && (
                    <span className="text-xs text-muted-foreground">
                      {source.date}
                    </span>
                  )}
                </div>
                
                {showSaveButton && onSaveResult && (
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => onSaveResult(source)}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save to Knowledge
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </ScrollArea>
      </div>
    </Card>
  );
};

export default ExternalSources;
export type { ExternalSource };
