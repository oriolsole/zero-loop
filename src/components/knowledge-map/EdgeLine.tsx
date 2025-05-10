
import React from 'react';
import { KnowledgeEdge, KnowledgeNode } from '../../types/intelligence';

interface EdgeLineProps {
  edge: KnowledgeEdge;
  knowledgeNodes: KnowledgeNode[];
  hoveredNode: string | null;
}

export const EdgeLine: React.FC<EdgeLineProps> = ({ 
  edge, 
  knowledgeNodes, 
  hoveredNode 
}) => {
  // Find source and target nodes
  const source = knowledgeNodes.find(n => n.id === edge.source);
  const target = knowledgeNodes.find(n => n.id === edge.target);
  
  if (!source || !target) return null;
  
  // Calculate edge path positions - Convert percentages to numeric values
  const sourceX = source.position.x;
  const sourceY = source.position.y;
  const targetX = target.position.x;
  const targetY = target.position.y;
  
  // Create a curved path - Convert percentages to numeric values
  const midX = (source.position.x + target.position.x) / 2;
  const midY = (source.position.y + target.position.y) / 2 - 10;
  
  const getEdgeTypeStyle = (type: string) => {
    switch (type) {
      case 'builds-on': return 'stroke-primary stroke-[1.5px]';
      case 'contradicts': return 'stroke-destructive stroke-[1.5px] stroke-dasharray-2';
      case 'related-to': return 'stroke-muted-foreground stroke-[1px]';
      case 'generalizes': return 'stroke-success stroke-[1.5px]';
      default: return 'stroke-muted-foreground/60 stroke-[1px]';
    }
  };

  return (
    <g key={edge.id} className="graph-edge">
      {/* Edge line - No % symbols in path definition */}
      <path
        d={`M ${sourceX} ${sourceY} Q ${midX} ${midY}, ${targetX} ${targetY}`}
        fill="none"
        className={`${getEdgeTypeStyle(edge.type)} transition-all duration-300`}
        markerEnd="url(#arrowhead)"
        opacity={
          hoveredNode ? 
            (edge.source === hoveredNode || edge.target === hoveredNode ? 1 : 0.15) 
            : 0.85
        }
      />
      
      {/* Optional: edge label - Convert percentages to numeric values */}
      {edge.label && (
        <text
          x={midX}
          y={midY}
          className="text-xs fill-muted-foreground text-center"
          textAnchor="middle"
        >
          {edge.label}
        </text>
      )}
    </g>
  );
};
