
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Globe, Link } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalSource } from '@/types/intelligence';

interface ExternalSourcesProps {
  sources: ExternalSource[];
  title?: string;
  description?: string;
  maxHeight?: string | number;
}

const ExternalSources: React.FC<ExternalSourcesProps> = ({ 
  sources, 
  title = "External Sources", 
  description = "Information retrieved from external knowledge sources",
  maxHeight = "300px"
}) => {
  if (!sources || sources.length === 0) {
    return null;
  }
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <ScrollArea style={{ maxHeight }} className="px-6">
        <CardContent className="space-y-4 pb-6">
          {sources.map((source, index) => (
            <div key={index} className="space-y-2">
              {index > 0 && <Separator className="my-3" />}
              
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-sm">{source.title}</h4>
                <Badge variant="outline" className="text-xs">
                  {source.source}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">{source.snippet}</p>
              
              <div className="flex gap-2 items-center">
                <a 
                  href={source.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Source
                </a>
                
                {source.date && (
                  <span className="text-xs text-muted-foreground">
                    {source.date}
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default ExternalSources;
