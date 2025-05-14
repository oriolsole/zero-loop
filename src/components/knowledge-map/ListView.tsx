
import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KnowledgeNode } from '../../types/intelligence';
import { highlightSearchMatch } from '../../utils/searchUtils';

interface ListViewProps {
  filteredNodes: KnowledgeNode[];
  selectedInsightId: string | null;
  setSelectedInsight: (id: string | null) => void;
  searchTerm?: string;
}

export const ListView: React.FC<ListViewProps> = ({
  filteredNodes,
  selectedInsightId,
  setSelectedInsight,
  searchTerm = ''
}) => {
  return (
    <ScrollArea className="h-[600px] border rounded-lg">
      <div className="p-4 space-y-4">
        {filteredNodes.map((node) => (
          <Card 
            key={node.id} 
            className={`${node.id === selectedInsightId ? 'border-primary' : ''}`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    node.type === 'rule' ? 'bg-primary' : 
                    node.type === 'concept' ? 'bg-knowledge' :
                    node.type === 'pattern' ? 'bg-success' : 'bg-warning'
                  }`} />
                  <Badge variant="outline" className="capitalize">{node.type}</Badge>
                </div>
                <Badge variant="secondary" className="text-xs">Loop #{node.discoveredInLoop}</Badge>
              </div>
              
              <h4 className="font-medium text-base mt-2 mb-1">
                {searchTerm ? (
                  <span dangerouslySetInnerHTML={{ 
                    __html: highlightSearchMatch(node.title || '', searchTerm) 
                  }} />
                ) : (
                  node.title
                )}
              </h4>
              
              <p className="text-sm text-muted-foreground">
                {searchTerm ? (
                  <span dangerouslySetInnerHTML={{ 
                    __html: highlightSearchMatch(node.description || '', searchTerm) 
                  }} />
                ) : (
                  node.description
                )}
              </p>
              
              <div className="flex justify-between items-center mt-4">
                {node.connections && (
                  <div className="text-xs text-muted-foreground">
                    <span>Connected to: </span>
                    <Badge variant="outline" className="text-xs mr-1">
                      {typeof node.connections === 'number' 
                        ? node.connections 
                        : node.connections.length} node(s)
                    </Badge>
                  </div>
                )}
                
                <Button 
                  variant={node.id === selectedInsightId ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setSelectedInsight(node.id === selectedInsightId ? null : node.id)}
                >
                  {node.id === selectedInsightId ? "Selected" : "Select"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
