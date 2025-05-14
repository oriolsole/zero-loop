
import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { KnowledgeNode, KnowledgeEdge } from '../../types/intelligence';
import { NodeCard } from './NodeCard';
import { EdgeLine } from './EdgeLine';

interface GraphViewProps {
  filteredNodes: KnowledgeNode[];
  filteredEdges: KnowledgeEdge[];
  knowledgeNodes: KnowledgeNode[];
  selectedInsightId: string | null;
  setSelectedInsight: (id: string | null) => void;
  recalculateGraphLayout: () => void;
  searchTerm?: string;
}

export const GraphView: React.FC<GraphViewProps> = ({
  filteredNodes,
  filteredEdges,
  knowledgeNodes,
  selectedInsightId,
  setSelectedInsight,
  recalculateGraphLayout,
  searchTerm = ''
}) => {
  const [zoom, setZoom] = React.useState(100);
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);

  return (
    <>
      <div className="relative h-[600px] overflow-hidden bg-secondary/20 rounded-lg border border-border p-6">
        {/* SVG graph with connectors */}
        <svg 
          width="100%" 
          height="100%" 
          className="absolute top-0 left-0" 
          style={{ transform: `scale(${zoom / 100})` }}
        >
          {/* Draw edges */}
          {filteredEdges.map((edge) => (
            <EdgeLine 
              key={edge.id}
              edge={edge} 
              knowledgeNodes={knowledgeNodes} 
              hoveredNode={hoveredNode} 
            />
          ))}
          
          {/* Arrow marker definition for edges */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" className="fill-muted-foreground" />
            </marker>
          </defs>
        </svg>
        
        {/* Node cards positioned absolutely */}
        {filteredNodes.map((node: KnowledgeNode) => (
          <NodeCard
            key={node.id}
            node={node}
            selectedInsightId={selectedInsightId}
            hoveredNode={hoveredNode}
            setHoveredNode={setHoveredNode}
            setSelectedInsight={setSelectedInsight}
            searchTerm={searchTerm}
          />
        ))}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 w-1/2">
          <ZoomOut className="w-4 h-4 text-muted-foreground" />
          <Slider 
            value={[zoom]} 
            min={50} 
            max={150} 
            step={10} 
            onValueChange={(values) => setZoom(values[0])} 
          />
          <ZoomIn className="w-4 h-4 text-muted-foreground" />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setZoom(100)}
            className="ml-2"
          >
            <Maximize className="w-3 h-3 mr-1" />
            <span>Reset</span>
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => recalculateGraphLayout()}
          >
            Recalculate Layout
          </Button>
        </div>
      </div>
    </>
  );
};
