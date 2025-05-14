import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import { useLoopStore } from '../store/useLoopStore';
import { formatDistanceToNow } from 'date-fns';
import { ExternalSource } from '@/types/intelligence';

// Define interface for external source display
interface ExternalSourceDisplay {
  title: string;
  link?: string;
  url?: string;
  snippet: string;
  source?: string;
  sourceName?: string;
  date?: string;
}

const InsightTimeline: React.FC = () => {
  const { loopHistory, activeDomainId, setSelectedInsight } = useLoopStore();
  const [filter, setFilter] = useState<'all' | 'rule' | 'concept' | 'pattern' | 'insight'>('all');
  
  // Get insights from all loops in the current domain, sorted by timestamp (newest first)
  const allDomainInsights = loopHistory
    .filter(loop => loop.domainId === activeDomainId && loop.insights && loop.insights.length > 0)
    .sort((a, b) => {
      const timestampA = typeof a.timestamp === 'number' ? a.timestamp : 0;
      const timestampB = typeof b.timestamp === 'number' ? b.timestamp : 0;
      return timestampB - timestampA;
    })
    .flatMap(loop => {
      return (loop.insights || []).map(insight => ({
        ...insight,
        loopId: loop.id,
        timestamp: loop.timestamp,
        loopNumber: loop.steps && loop.steps[0]?.metrics?.loopNumber || '?'
      }));
    });
    
  // Apply filter if needed
  const displayInsights = filter === 'all' 
    ? allDomainInsights 
    : allDomainInsights.filter(insight => {
        // This is a simplified filter - in a real implementation we'd need to fetch node type
        const typeIndicators = {
          rule: ['rule', 'should', 'must', 'always', 'never'],
          concept: ['concept', 'understand', 'idea', 'represents'],
          pattern: ['pattern', 'recurring', 'common', 'often'],
          insight: ['discover', 'realize', 'found', 'observed']
        };
        
        const text = insight.text.toLowerCase();
        const indicators = typeIndicators[filter];
        
        return indicators.some(indicator => text.includes(indicator));
      });
  
  if (displayInsights.length === 0) {
    return (
      <Card className="border-dashed border-2 p-8 flex flex-col items-center justify-center">
        <div className="text-muted-foreground text-center">
          <Brain className="w-10 h-10 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Insights Yet</h3>
          <p className="mb-4">Complete some learning loops to generate insights</p>
        </div>
      </Card>
    );
  }
  
  // Helper function to safely get a string representation of metric values
  const renderMetricValue = (value: string | number | ExternalSource[] | undefined): string => {
    if (value === undefined) return "-";
    if (typeof value === "string" || typeof value === "number") return value.toString();
    if (Array.isArray(value)) return `${value.length} sources`;
    return JSON.stringify(value);
  };
  
  // Helper function to safely render loop numbers, ensuring we only render strings
  const renderLoopNumber = (loopNumber: any): string => {
    if (typeof loopNumber === "string" || typeof loopNumber === "number") {
      return loopNumber.toString();
    }
    return "?";
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Insight Timeline</h3>
        <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="rule">Rules</TabsTrigger>
            <TabsTrigger value="concept">Concepts</TabsTrigger>
            <TabsTrigger value="pattern">Patterns</TabsTrigger>
            <TabsTrigger value="insight">Insights</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-4">
          {displayInsights.map((insight, index) => (
            <Card 
              key={`${insight.loopId}-${index}`}
              className="relative border-l-4 border-l-primary"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Insight from Loop #{renderLoopNumber(insight.loopNumber)}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground flex items-center mt-1">
                      <span>{typeof insight.timestamp === 'number' 
                        ? formatDistanceToNow(new Date(insight.timestamp), { addSuffix: true })
                        : 'Unknown time'}</span>
                    </div>
                  </div>
                  <Badge variant="outline">
                    Confidence: {Math.round((insight.confidence || 0) * 100)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{insight.text}</p>
                
                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1 h-auto"
                      onClick={() => {
                        // In a full implementation, this would update the feedback
                      }}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1 h-auto"
                      onClick={() => {
                        // In a full implementation, this would update the feedback
                      }}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1 h-auto"
                      onClick={() => {
                        // In a full implementation, this would mark as important
                      }}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {insight.nodeIds && insight.nodeIds.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedInsight(insight.nodeIds![0])}
                    >
                      View in Knowledge Map
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default InsightTimeline;
