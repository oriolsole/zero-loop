
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Globe, Link, Save, Database, File, FileText, Video, Image, Calendar, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ExternalSource } from '@/types/intelligence';
import { cn } from '@/lib/utils';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { format } from "date-fns";

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

  // Function to get appropriate icon based on content type
  const getContentTypeIcon = (source: ExternalSource) => {
    if (!source.contentType) return <Globe className="h-3 w-3" />;
    
    const type = source.contentType.toLowerCase();
    
    if (type.includes('pdf') || source.fileFormat === 'pdf') {
      return <File className="h-3 w-3" />;
    } else if (type.includes('video') || source.fileFormat === 'mp4' || source.fileFormat === 'avi') {
      return <Video className="h-3 w-3" />;
    } else if (type.includes('image') || source.fileFormat === 'jpg' || source.fileFormat === 'png') {
      return <Image className="h-3 w-3" />;
    } else if (type.includes('article')) {
      return <FileText className="h-3 w-3" />;
    } else {
      return <Globe className="h-3 w-3" />;
    }
  };
  
  // Format date in a readable way if present
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy');
    } catch (e) {
      return dateString; // If parsing fails, return the original string
    }
  };
  
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
        height: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
        maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight
      }}>
        <ScrollArea className="h-full w-full">
          <CardContent className="space-y-4 pb-6 px-6">
            {sources.map((source, index) => (
              <div key={index} className="space-y-3 border border-muted rounded-md p-3 bg-background">
                {index > 0 && <Separator className="my-3 hidden" />}
                
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{source.title}</h4>
                    
                    {/* Source badges */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {/* Source type badge */}
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
                      
                      {/* Content type badge */}
                      {source.contentType && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          {getContentTypeIcon(source)}
                          {source.contentType.charAt(0).toUpperCase() + source.contentType.slice(1)}
                        </Badge>
                      )}
                      
                      {/* File format badge */}
                      {source.fileFormat && (
                        <Badge variant="outline" className="text-xs uppercase">
                          {source.fileFormat}
                        </Badge>
                      )}
                      
                      {/* Source domain badge */}
                      <Badge variant="outline" className="text-xs">
                        {source.source}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Show thumbnail if available */}
                  {source.thumbnailUrl && (
                    <div className="w-16 h-16 flex-shrink-0">
                      <AspectRatio ratio={1/1} className="bg-muted rounded-md overflow-hidden">
                        <img 
                          src={source.thumbnailUrl} 
                          alt={source.title}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            // Hide image on error
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </AspectRatio>
                    </div>
                  )}
                </div>
                
                {/* Content snippet */}
                <div>
                  <p className="text-sm text-muted-foreground">{source.snippet}</p>
                  
                  {/* Publisher info if available */}
                  {source.publisher && (
                    <div className="mt-1 text-xs flex items-center gap-1 text-muted-foreground">
                      <Building className="h-3 w-3" />
                      {source.publisher}
                    </div>
                  )}
                </div>
                
                {/* Link and date info */}
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
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
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(source.date)}
                      </span>
                    )}
                  </div>
                  
                  {/* Save button */}
                  {showSaveButton && onSaveResult && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => onSaveResult(source)}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save to Knowledge
                    </Button>
                  )}
                </div>
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
