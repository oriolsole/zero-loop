
import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react";

interface DebugLogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

interface DebugConsoleProps {
  logs: DebugLogEntry[];
  isVisible?: boolean;
  onToggle?: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ 
  logs, 
  isVisible = false, 
  onToggle 
}) => {
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const toggleLogExpansion = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'outline';
      case 'success':
        return 'default';
      case 'info':
      default:
        return 'secondary';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="w-full max-h-96 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Debug Console</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {logs.length} entries
            </Badge>
            {onToggle && (
              <Button variant="ghost" size="sm" onClick={onToggle}>
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-80 p-4">
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className="border rounded-lg">
                <Collapsible>
                  <CollapsibleTrigger 
                    className="w-full p-3 text-left hover:bg-muted/50 flex items-center gap-2"
                    onClick={() => toggleLogExpansion(index)}
                  >
                    {expandedLogs.has(index) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {getLevelIcon(log.level)}
                    <Badge variant={getLevelBadgeVariant(log.level)} className="text-xs">
                      {log.level}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {log.timestamp}
                    </span>
                    <span className="text-sm flex-1 truncate">
                      {log.message}
                    </span>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="px-3 pb-3 border-t bg-muted/20">
                    <div className="mt-2 space-y-2">
                      <div className="text-sm">
                        <strong>Message:</strong> {log.message}
                      </div>
                      {log.details && (
                        <div className="text-xs">
                          <strong>Details:</strong>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {typeof log.details === 'string' 
                              ? log.details 
                              : JSON.stringify(log.details, null, 2)
                            }
                          </pre>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
            
            {logs.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No debug logs available
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
