
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ExternalSource {
  title: string;
  link: string;
  snippet: string;
  source: string;
  date?: string | null;
}

interface ExternalSourcesProps {
  sources: ExternalSource[];
  title?: string;
  description?: string;
}

const ExternalSources: React.FC<ExternalSourcesProps> = ({ 
  sources, 
  title = "External Sources", 
  description = "Information retrieved from external knowledge sources"
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
      
      <CardContent className="space-y-4">
        {sources.map((source, index) => (
          <div key={index} className="space-y-2">
            {index > 0 && <Separator />}
            
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-sm">{source.title}</h4>
              <Badge variant="outline">{source.source}</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">{source.snippet}</p>
            
            <a 
              href={source.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              View Source
              {source.date && <span className="text-muted-foreground ml-2">({source.date})</span>}
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ExternalSources;
