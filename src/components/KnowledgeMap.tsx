
import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KnowledgeNode } from '../types/intelligence';

const KnowledgeMap: React.FC<{ domain: any }> = ({ domain }) => {
  const { knowledgeNodes } = domain;
  
  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'rule': return 'bg-primary/10 border-primary/30 text-primary';
      case 'concept': return 'bg-knowledge/10 border-knowledge/30 text-knowledge';
      case 'insight': return 'bg-warning/10 border-warning/30 text-warning';
      case 'pattern': return 'bg-success/10 border-success/30 text-success';
      default: return 'bg-secondary border-muted text-muted-foreground';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="relative h-[600px] overflow-hidden bg-secondary/20 rounded-lg border border-border p-6">
        {/* Connector lines would be placed here in a full implementation */}
        
        {knowledgeNodes.map((node: KnowledgeNode, index: number) => (
          <div 
            key={index}
            className={`absolute node-card ${getNodeTypeColor(node.type)}`} 
            style={{
              top: `${node.position.y}%`,
              left: `${node.position.x}%`,
              width: `${node.size || 15}%`,
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <Badge variant="outline" className="capitalize">{node.type}</Badge>
              <Badge variant="secondary" className="text-xs">Loop #{node.discoveredInLoop}</Badge>
            </div>
            <h4 className="font-medium text-sm mb-1">{node.title}</h4>
            <p className="text-xs text-muted-foreground">{node.description}</p>
            
            {node.connections && node.connections.length > 0 && (
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                <span>Connected to: </span>
                {node.connections.map((conn, i) => (
                  <Badge key={i} variant="outline" className="text-xs mr-1">{conn}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-sm">Rule</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-knowledge"></div>
            <span className="text-sm">Concept</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <span className="text-sm">Insight</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="text-sm">Pattern</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Total knowledge nodes: {knowledgeNodes.length}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeMap;
