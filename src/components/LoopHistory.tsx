
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Brain } from 'lucide-react';
import { useLoopStore } from '../store/useLoopStore';
import { LoopHistory as LoopHistoryType, ExternalSource } from '../types/intelligence';
import { formatDistanceToNow } from 'date-fns';

const LoopHistory = () => {
  const { loopHistory, loadPreviousLoop, activeDomainId } = useLoopStore();
  const [selectedLoop, setSelectedLoop] = useState<string | null>(null);
  
  // Filter history by active domain
  const domainHistory = loopHistory
    .filter(loop => loop.domainId === activeDomainId)
    .sort((a, b) => {
      const timestampA = typeof a.timestamp === 'number' ? a.timestamp : 0;
      const timestampB = typeof b.timestamp === 'number' ? b.timestamp : 0;
      return timestampB - timestampA;
    });
  
  const handleLoadLoop = (loopId: string) => {
    loadPreviousLoop(loopId);
    setSelectedLoop(loopId);
  };
  
  // Helper function to safely get a string representation of metric values
  const formatMetricValue = (value: string | number | any[] | unknown): string => {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'string' || typeof value === 'number') return value.toString();
    if (Array.isArray(value)) return `${value.length} items`;
    return JSON.stringify(value);
  };

  // Helper function to safely get loop number
  const getLoopNumber = (loop: LoopHistoryType): string => {
    if (loop.steps && loop.steps[0]?.metrics?.loopNumber !== undefined) {
      const loopNumber = loop.steps[0].metrics.loopNumber;
      return typeof loopNumber === 'string' || typeof loopNumber === 'number' 
        ? loopNumber.toString() 
        : '?';
    }
    return '?';
  };
  
  if (domainHistory.length === 0) {
    return (
      <Card className="border-dashed border-2 p-8 flex flex-col items-center justify-center">
        <div className="text-muted-foreground text-center">
          <Brain className="w-10 h-10 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Loop History</h3>
          <p className="mb-4">Complete some learning loops to build history</p>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Loop History</h3>
        <Badge variant="outline">{domainHistory.length} loops</Badge>
      </div>
      
      <ScrollArea className="h-[600px] rounded-md border">
        <div className="p-4 space-y-4">
          {domainHistory.map((loop) => (
            <Card 
              key={loop.id} 
              className={`transition-colors hover:bg-secondary/20 cursor-pointer ${selectedLoop === loop.id ? 'border-primary' : ''}`}
              onClick={() => handleLoadLoop(loop.id)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base flex items-center gap-2">
                    {loop.success ? (
                      <CheckCircle className="text-success w-4 h-4" />
                    ) : (
                      <XCircle className="text-destructive w-4 h-4" />
                    )}
                    Loop #{getLoopNumber(loop)}
                  </CardTitle>
                  <Badge variant={loop.success ? "default" : "destructive"}>
                    {loop.success ? "Success" : "Failure"}
                  </Badge>
                </div>
                <CardDescription className="flex justify-between items-center">
                  <span className="text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {typeof loop.timestamp === 'number' 
                      ? formatDistanceToNow(new Date(loop.timestamp), { addSuffix: true })
                      : 'Unknown time'}
                  </span>
                  <span className="text-xs">
                    Score: {loop.score}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-xs text-muted-foreground line-clamp-2">
                  Task: {loop.steps && loop.steps[0]?.content}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between">
                <div className="flex gap-2">
                  {loop.steps && loop.steps.map((step, index) => (
                    <div 
                      key={index} 
                      className={`w-2 h-2 rounded-full ${
                        step.status === 'success' 
                          ? 'bg-success' 
                          : step.status === 'failure' 
                            ? 'bg-destructive' 
                            : step.status === 'warning'
                              ? 'bg-warning'
                              : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={(e) => {
                  e.stopPropagation();
                  handleLoadLoop(loop.id);
                }}>
                  View
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default LoopHistory;
