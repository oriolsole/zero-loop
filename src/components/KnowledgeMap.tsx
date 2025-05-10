
import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain } from 'lucide-react';
import { KnowledgeNode, KnowledgeEdge, Domain } from '../types/intelligence';
import { useLoopStore } from '../store/useLoopStore';
import { GraphView } from './knowledge-map/GraphView';
import { ListView } from './knowledge-map/ListView';
import { Legend } from './knowledge-map/Legend';

interface KnowledgeMapProps {
  domain: Domain;
}

const KnowledgeMap: React.FC<KnowledgeMapProps> = ({ domain }) => {
  const { knowledgeNodes, knowledgeEdges = [] } = domain;
  const { selectedInsightId, setSelectedInsight, recalculateGraphLayout } = useLoopStore();
  
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [filterType, setFilterType] = useState<'all' | 'rule' | 'concept' | 'pattern' | 'insight'>('all');
  
  useEffect(() => {
    // Highlight selected node if any
    if (selectedInsightId) {
      // In a real implementation, we might scroll to or focus the selected node
    }
  }, [selectedInsightId]);
  
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
        <GraphView 
          filteredNodes={filteredNodes}
          filteredEdges={filteredEdges}
          knowledgeNodes={knowledgeNodes}
          selectedInsightId={selectedInsightId}
          setSelectedInsight={setSelectedInsight}
          recalculateGraphLayout={recalculateGraphLayout}
        />
      ) : (
        <ListView 
          filteredNodes={filteredNodes}
          selectedInsightId={selectedInsightId}
          setSelectedInsight={setSelectedInsight}
        />
      )}
      
      <Legend knowledgeNodes={knowledgeNodes} />
    </div>
  );
};

export default KnowledgeMap;
