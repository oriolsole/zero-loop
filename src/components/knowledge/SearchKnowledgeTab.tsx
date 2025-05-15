
import React, { useState, useEffect } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useExternalKnowledge } from '@/hooks/useExternalKnowledge';
import { ExternalSource } from '@/types/intelligence';
import ExternalSources from '@/components/ExternalSources';
import SaveSearchResult from '@/components/knowledge/SaveSearchResult';
import SearchOptions from '@/components/knowledge/SearchOptions';
import SearchResults from '@/components/knowledge/SearchResults';
import { domainEngines } from '@/engines/domainEngines';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Info, Loader2 } from "lucide-react";

const SearchKnowledgeTab: React.FC = () => {
  const { 
    queryKnowledgeBase, 
    isQuerying, 
    queryError, 
    recentResults,
  } = useKnowledgeBase();
  
  const {
    searchWeb,
    isSearching: isSearchingWeb,
    recentSources: webResults,
    searchError: webSearchError
  } = useExternalKnowledge();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [useEmbeddings, setUseEmbeddings] = useState<boolean>(true);
  const [includeWebResults, setIncludeWebResults] = useState<boolean>(false);
  const [includeNodeResults, setIncludeNodeResults] = useState<boolean>(true);
  const [matchThreshold, setMatchThreshold] = useState<number>(0.5);
  const [selectedResult, setSelectedResult] = useState<ExternalSource | null>(null);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [allResults, setAllResults] = useState<ExternalSource[]>([]);
  const [activeResultsTab, setActiveResultsTab] = useState<'all' | 'knowledge' | 'web' | 'node'>('all');
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the knowledge search engine
  const knowledgeSearchEngine = domainEngines['knowledge-search'];
  
  // Combine results whenever they change
  useEffect(() => {
    if (hasSearched) {
      // Add source type to distinguish between knowledge base and web results
      const knowledgeResults = recentResults.filter(result => result.sourceType !== 'node').map(result => ({
        ...result,
        sourceType: result.sourceType || 'knowledge' as const
      }));

      // Knowledge nodes
      const nodeResults = recentResults.filter(result => result.sourceType === 'node');
      
      // Fix the type error by explicitly casting web results
      const googleResults = webResults.map(result => ({
        ...result,
        sourceType: 'web' as const
      }));
      
      // Combine all results with correct typing
      let combined = [...knowledgeResults, ...nodeResults];
      
      if (includeWebResults) {
        // Explicitly type the combined array to accept both sourceTypes
        combined = [...combined, ...googleResults as unknown as typeof knowledgeResults];
      }
      
      setAllResults(combined);
    }
  }, [recentResults, webResults, hasSearched, includeWebResults]);
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setHasSearched(false);
    
    try {
      // Use the knowledge search engine if available
      if (knowledgeSearchEngine) {
        const result = await knowledgeSearchEngine.solveTask(searchQuery, {
          includeWeb: includeWebResults,
          useEmbeddings,
          matchThreshold,
          includeNodes: includeNodeResults,
          limit: 10
        });
        
        if (result?.metadata?.sources?.length > 0) {
          setAllResults(result.metadata.sources);
          setHasSearched(true);
          setIsLoading(false);
          setActiveResultsTab('all');
          return;
        }
      }
      
      // Fall back to the original implementation if engine fails
      // Create an array of promises to run in parallel
      const searchPromises = [];
      
      // Always query knowledge base
      searchPromises.push(
        queryKnowledgeBase({
          query: searchQuery,
          limit: 10,
          useEmbeddings,
          matchThreshold,
          includeNodes: includeNodeResults
        })
      );
      
      // Conditionally add web search if enabled
      if (includeWebResults) {
        searchPromises.push(
          searchWeb(searchQuery, 5)
        );
      }
      
      // Wait for all search operations to complete
      await Promise.all(searchPromises);
      
      setHasSearched(true);
      setActiveResultsTab('all');
    } catch (error) {
      console.error('Error during search:', error);
      // Show error toast or message
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveResult = (result: ExternalSource) => {
    setSelectedResult(result);
    setShowSavePanel(true);
  };
  
  const handleCloseSavePanel = () => {
    setSelectedResult(null);
    setShowSavePanel(false);
  };
  
  // Filter results based on the active tab
  const getFilteredResults = () => {
    if (activeResultsTab === 'all') {
      return allResults;
    } else if (activeResultsTab === 'knowledge') {
      return allResults.filter(result => result.sourceType === 'knowledge');
    } else if (activeResultsTab === 'node') {
      return allResults.filter(result => result.sourceType === 'node');
    } else {
      return allResults.filter(result => result.sourceType === 'web');
    }
  };
  
  const filteredResults = getFilteredResults();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Knowledge Base
          </CardTitle>
          <CardDescription>
            Search your existing knowledge and optionally include web results
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="search">Search Query</Label>
                
                <SearchOptions 
                  useEmbeddings={useEmbeddings}
                  setUseEmbeddings={setUseEmbeddings}
                  matchThreshold={matchThreshold}
                  setMatchThreshold={setMatchThreshold}
                  includeNodeResults={includeNodeResults}
                  setIncludeNodeResults={setIncludeNodeResults}
                  includeWebResults={includeWebResults}
                  setIncludeWebResults={setIncludeWebResults}
                />
              </div>
              
              <div className="flex gap-2">
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter search terms"
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !searchQuery.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">Search</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {hasSearched && (
        <div className="space-y-4">
          {/* Error messages */}
          {(queryError || (includeWebResults && webSearchError)) && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              {queryError && <p className="text-red-700">{queryError}</p>}
              {includeWebResults && webSearchError && <p className="text-red-700">{webSearchError}</p>}
            </div>
          )}
          
          {/* No results message */}
          {!queryError && filteredResults.length === 0 ? (
            <div className="bg-muted p-8 rounded-md text-center">
              <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-1">No results found</h3>
              <p className="text-muted-foreground">
                Try different search terms, adjusting the search method, or {!includeWebResults && "enabling web search"}
              </p>
            </div>
          ) : (
            <SearchResults
              filteredResults={filteredResults}
              allResults={allResults}
              activeResultsTab={activeResultsTab}
              setActiveResultsTab={setActiveResultsTab}
              includeNodeResults={includeNodeResults}
              includeWebResults={includeWebResults}
              searchQuery={searchQuery}
              onSaveResult={handleSaveResult}
            />
          )}
        </div>
      )}
      
      {/* Save result slide-over panel */}
      {showSavePanel && selectedResult && (
        <SaveSearchResult
          result={selectedResult}
          onClose={handleCloseSavePanel}
          isOpen={showSavePanel}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
};

export default SearchKnowledgeTab;
