
import React from 'react';
import { ExternalSource } from '@/types/intelligence';
import ExternalSources from '@/components/ExternalSources';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Database, Brain, Globe } from "lucide-react";

interface SearchResultsProps {
  filteredResults: ExternalSource[];
  allResults: ExternalSource[];
  activeResultsTab: 'all' | 'knowledge' | 'web' | 'node';
  setActiveResultsTab: (tab: 'all' | 'knowledge' | 'web' | 'node') => void;
  includeNodeResults: boolean;
  includeWebResults: boolean;
  searchQuery: string;
  onSaveResult: (result: ExternalSource) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  filteredResults,
  allResults,
  activeResultsTab,
  setActiveResultsTab,
  includeNodeResults,
  includeWebResults,
  searchQuery,
  onSaveResult
}) => {
  return (
    <div>
      {/* Result filtering tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Search Results</h3>
          <Badge variant="outline" className="flex gap-1 items-center">
            {activeResultsTab === 'all' ? (
              <><Search className="h-3 w-3" /> All Sources</>
            ) : activeResultsTab === 'knowledge' ? (
              <><Database className="h-3 w-3" /> Knowledge Base</>
            ) : activeResultsTab === 'node' ? (
              <><Brain className="h-3 w-3" /> Knowledge Nodes</>
            ) : (
              <><Globe className="h-3 w-3" /> Web</>
            )}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={activeResultsTab === 'all' ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveResultsTab('all')}
            className="flex items-center gap-1"
          >
            <Search className="h-3 w-3" />
            All ({allResults.length})
          </Button>
          <Button
            variant={activeResultsTab === 'knowledge' ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveResultsTab('knowledge')}
            className="flex items-center gap-1"
          >
            <Database className="h-3 w-3" />
            Knowledge ({allResults.filter(r => r.sourceType === 'knowledge').length})
          </Button>
          {includeNodeResults && (
            <Button
              variant={activeResultsTab === 'node' ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveResultsTab('node')}
              className="flex items-center gap-1"
            >
              <Brain className="h-3 w-3" />
              Nodes ({allResults.filter(r => r.sourceType === 'node').length})
            </Button>
          )}
          {includeWebResults && (
            <Button
              variant={activeResultsTab === 'web' ? "default" : "outline"}
              size="sm" 
              onClick={() => setActiveResultsTab('web')}
              className="flex items-center gap-1"
            >
              <Globe className="h-3 w-3" />
              Web ({allResults.filter(r => r.sourceType === 'web').length})
            </Button>
          )}
        </div>
      </div>
      
      {/* Search result counts */}
      <div className="text-sm text-muted-foreground mb-2">
        Found {filteredResults.length} results for "{searchQuery}"
      </div>
      
      {/* Results display */}
      <ExternalSources 
        sources={filteredResults}
        title="Search Results"
        description={`Found ${filteredResults.length} results for "${searchQuery}"`}
        showSaveButton={true}
        onSaveResult={onSaveResult}
      />
    </div>
  );
};

export default SearchResults;
