
import React from 'react';
import { KnowledgeNode } from '../../types/intelligence';

interface LegendProps {
  knowledgeNodes: KnowledgeNode[];
}

export const Legend: React.FC<LegendProps> = ({ knowledgeNodes }) => {
  return (
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
  );
};
