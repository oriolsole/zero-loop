
import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Search, X } from 'lucide-react';
import { KnowledgeNode, KnowledgeEdge, Domain } from '../types/intelligence';
import { useLoopStore } from '../store/useLoopStore';
import { GraphView } from './knowledge-map/GraphView';
import { ListView } from './knowledge-map/ListView';
import { Legend } from './knowledge-map/Legend';
import { Input } from "@/components/ui/input";

interface KnowledgeMapProps {
  domain: Domain;
}

const KnowledgeMap: React.FC<KnowledgeMapProps> = ({ domain }) => {
  const { knowledgeNodes, knowledgeEdges = [] } = domain;
  const { selectedInsightId, setSelectedInsight, recalculateGraphLayout } = useLoopStore();
  
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [filterType, setFilterType] = useState<'all' | 'rule' | 'concept' | 'pattern' | 'insight'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  useEffect(() => {
    // Highlight selected node if any
    if (selectedInsightId) {
      // In a real implementation, we might scroll to or focus the selected node
    }
  }, [selectedInsightId]);
  
  // Search function to match nodes against search term
  const matchesSearch = (node: KnowledgeNode, term: string): boolean => {
    if (!term) return true;
    const searchLower = term.toLowerCase();
    return (
      (node.title?.toLowerCase().includes(searchLower) || false) ||
      (node.description?.toLowerCase().includes(searchLower) || false)
    );
  };
  
  // Filter nodes by type and search term
  const filteredNodes = knowledgeNodes
    .filter(node => filterType === 'all' || node.type === filterType)
    .filter(node => matchesSearch(node, searchTerm));
  
  // Only include edges where both source and target are in the filtered nodes
  const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
  const filteredEdges = knowledgeEdges.filter(edge => 
    filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
  );
  
  // Clear search function
  const clearSearch = () => {
    setSearchTerm('');
  };
  
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
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search knowledge nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button 
              onClick={clearSearch} 
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          )}
        </div>
        
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
      </div>
      
      {filteredNodes.length === 0 ? (
        <div className="border rounded-lg p-8 flex flex-col items-center justify-center">
          <div className="text-muted-foreground text-center">
            <Search className="w-10 h-10 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Results Found</h3>
            <p className="mb-4">Try adjusting your search or filter criteria</p>
            {searchTerm && (
              <button 
                onClick={clearSearch}
                className="text-primary hover:underline"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'graph' ? (
            <GraphView 
              filteredNodes={filteredNodes}
              filteredEdges={filteredEdges}
              knowledgeNodes={knowledgeNodes}
              selectedInsightId={selectedInsightId}
              setSelectedInsight={setSelectedInsight}
              recalculateGraphLayout={recalculateGraphLayout}
              searchTerm={searchTerm}
            />
          ) : (
            <ListView 
              filteredNodes={filteredNodes}
              selectedInsightId={selectedInsightId}
              setSelectedInsight={setSelectedInsight}
              searchTerm={searchTerm}
            />
          )}
        </>
      )}
      
      <Legend knowledgeNodes={knowledgeNodes} />
    </div>
  );
};

export default KnowledgeMap;
