
import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Brain, ZoomIn, ZoomOut, Maximize, Search } from 'lucide-react';
import { KnowledgeNode, KnowledgeEdge, Domain } from '../types/intelligence';
import { useLoopStore } from '../store/useLoopStore';

interface KnowledgeMapProps {
  domain: Domain;
}

const KnowledgeMap: React.FC<KnowledgeMapProps> = ({ domain }) => {
  const { knowledgeNodes, knowledgeEdges = [] } = domain;
  const { selectedInsightId, setSelectedInsight, recalculateGraphLayout } = useLoopStore();
  
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'rule' | 'concept' | 'pattern' | 'insight'>('all');
  
  useEffect(() => {
    // Highlight selected node if any
    if (selectedInsightId) {
      // In a real implementation, we might scroll to or focus the selected node
    }
  }, [selectedInsightId]);
  
  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'rule': return 'bg-primary/10 border-primary/30 text-primary';
      case 'concept': return 'bg-knowledge/10 border-knowledge/30 text-knowledge';
      case 'insight': return 'bg-warning/10 border-warning/30 text-warning';
      case 'pattern': return 'bg-success/10 border-success/30 text-success';
      default: return 'bg-secondary border-muted text-muted-foreground';
    }
  };
  
  const getNodeTypeBorderColor = (type: string) => {
    switch (type) {
      case 'rule': return 'stroke-primary';
      case 'concept': return 'stroke-knowledge';
      case 'insight': return 'stroke-warning';
      case 'pattern': return 'stroke-success';
      default: return 'stroke-muted-foreground';
    }
  };
  
  const getEdgeTypeStyle = (type: string) => {
    switch (type) {
      case 'builds-on': return 'stroke-primary stroke-[1.5px]';
      case 'contradicts': return 'stroke-destructive stroke-[1.5px] stroke-dasharray-2';
      case 'related-to': return 'stroke-muted-foreground stroke-[1px]';
      case 'generalizes': return 'stroke-success stroke-[1.5px]';
      default: return 'stroke-muted-foreground/60 stroke-[1px]';
    }
  };
  
  // Filter nodes by type if selected
  const filteredNodes = filterType === 'all' 
    ? knowledgeNodes 
    : knowledgeNodes.filter(node => node.type === filterType);
  
  // Only include edges where both source and target are in the filtered nodes
  const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
  const filteredEdges = knowledgeEdges.filter(edge => 
    filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
  );
  
  if (knowledgeNodes.length === 0) {
    return (
      <Card className="border-dashed border-2 p-8 flex flex-col items-center justify-center">
        <div className="text-muted-foreground text-center">
          <Brain className="w-10 h-10 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Knowledge Nodes Yet</h3>
          <p className="mb-4">Complete some learning loops to build the knowledge graph</p>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs defaultValue={filterType} onValueChange={(v) => setFilterType(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All Types</TabsTrigger>
            <TabsTrigger value="rule">Rules</TabsTrigger>
            <TabsTrigger value="concept">Concepts</TabsTrigger>
            <TabsTrigger value="pattern">Patterns</TabsTrigger>
            <TabsTrigger value="insight">Insights</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Tabs defaultValue={viewMode} onValueChange={(v) => setViewMode(v as 'graph' | 'list')}>
          <TabsList>
            <TabsTrigger value="graph">Graph View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {viewMode === 'graph' ? (
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
              {filteredEdges.map((edge) => {
                // Find source and target nodes
                const source = knowledgeNodes.find(n => n.id === edge.source);
                const target = knowledgeNodes.find(n => n.id === edge.target);
                
                if (!source || !target) return null;
                
                // Calculate edge path positions
                const sourceX = `${source.position.x}%`;
                const sourceY = `${source.position.y}%`;
                const targetX = `${target.position.x}%`;
                const targetY = `${target.position.y}%`;
                
                // Create a curved path
                const midX = (source.position.x + target.position.x) / 2;
                const midY = (source.position.y + target.position.y) / 2 - 10;
                
                return (
                  <g key={edge.id} className="graph-edge">
                    {/* Edge line */}
                    <path
                      d={`M ${sourceX} ${sourceY} Q ${midX}% ${midY}%, ${targetX} ${targetY}`}
                      fill="none"
                      className={`${getEdgeTypeStyle(edge.type)} transition-all duration-300`}
                      markerEnd="url(#arrowhead)"
                      opacity={
                        hoveredNode ? 
                          (edge.source === hoveredNode || edge.target === hoveredNode ? 1 : 0.15) 
                          : 0.85
                      }
                    />
                    
                    {/* Optional: edge label */}
                    {edge.label && (
                      <text
                        x={`${midX}%`}
                        y={`${midY}%`}
                        className="text-xs fill-muted-foreground text-center"
                        textAnchor="middle"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
              
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
                <h4 className="font-medium text-sm mb-1">{node.title}</h4>
                <p className="text-xs text-muted-foreground">{node.description}</p>
              </div>
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
      ) : (
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
                  
                  <h4 className="font-medium text-base mt-2 mb-1">{node.title}</h4>
                  <p className="text-sm text-muted-foreground">{node.description}</p>
                  
                  <div className="flex justify-between items-center mt-4">
                    {node.connections && node.connections.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span>Connected to: </span>
                        <Badge variant="outline" className="text-xs mr-1">
                          {node.connections.length} node(s)
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
      )}
      
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
