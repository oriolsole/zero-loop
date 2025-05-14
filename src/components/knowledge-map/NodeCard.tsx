
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { KnowledgeNode } from '../../types/intelligence';
import { highlightSearchMatch } from '../../utils/searchUtils';

interface NodeCardProps {
  node: KnowledgeNode;
  selectedInsightId: string | null;
  hoveredNode: string | null;
  setHoveredNode: (id: string | null) => void;
  setSelectedInsight: (id: string | null) => void;
  searchTerm?: string;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  selectedInsightId,
  hoveredNode,
  setHoveredNode,
  setSelectedInsight,
  searchTerm = ''
}) => {
  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'rule': return 'bg-primary/10 border-primary/30 text-primary';
      case 'concept': return 'bg-knowledge/10 border-knowledge/30 text-knowledge';
      case 'insight': return 'bg-warning/10 border-warning/30 text-warning';
      case 'pattern': return 'bg-success/10 border-success/30 text-success';
      default: return 'bg-secondary border-muted text-muted-foreground';
    }
  };

  // Truncate node ID for display purposes (UUID can be very long)
  const truncatedId = node.id.substring(0, 8);

  return (
    <div 
      key={node.id}
      className={`absolute node-card ${getNodeTypeColor(node.type)} ${
        node.id === selectedInsightId ? 'ring-2 ring-primary' : ''
      } ${
        hoveredNode && node.id !== hoveredNode ? 'opacity-30' : 'opacity-100'
      }`} 
      style={{
        top: `${node.position.y}%`,
        left: `${node.position.x}%`,
        width: `${node.size || 15}%`,
        transform: 'translate(-50%, -50%)',
        transition: 'opacity 0.3s ease'
      }}
      onClick={() => setSelectedInsight(node.id === selectedInsightId ? null : node.id)}
      onMouseEnter={() => setHoveredNode(node.id)}
      onMouseLeave={() => setHoveredNode(null)}
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant="outline" className="capitalize">{node.type}</Badge>
        <Badge variant="secondary" className="text-xs">Loop #{node.discoveredInLoop}</Badge>
      </div>
      <h4 className="font-medium text-sm mb-1">
        {searchTerm ? (
          <span dangerouslySetInnerHTML={{ 
            __html: highlightSearchMatch(node.title || '', searchTerm) 
          }} />
        ) : (
          node.title
        )}
      </h4>
      <p className="text-xs text-muted-foreground">
        {searchTerm ? (
          <span dangerouslySetInnerHTML={{ 
            __html: highlightSearchMatch(node.description || '', searchTerm) 
          }} />
        ) : (
          node.description
        )}
      </p>
    </div>
  );
};
