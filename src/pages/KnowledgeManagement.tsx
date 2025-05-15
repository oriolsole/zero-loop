import React, { useState, useEffect } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useExternalKnowledge } from '@/hooks/useExternalKnowledge';
import KnowledgeUpload from '@/components/knowledge/KnowledgeUpload';
import KnowledgeLibrary from '@/components/knowledge/KnowledgeLibrary';
import KnowledgeEngines from '@/components/knowledge/KnowledgeEngines';
import ExternalSources from '@/components/ExternalSources';
import SaveSearchResult from '@/components/knowledge/SaveSearchResult';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Info, Sliders, BookOpen, Library, Globe, Database, Brain, Cog } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ensureStorageBucketsExist } from '@/utils/supabase/storage';
import { ExternalSource } from '@/types/intelligence';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const KnowledgeManagement: React.FC = () => {
  const { 
    queryKnowledgeBase, 
    isQuerying, 
    queryError, 
    recentResults,
    searchMode,
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
  const [includeNodeResults, setIncludeNodeResults] = useState<boolean>(true); // New state for including nodes
  const [matchThreshold, setMatchThreshold] = useState<number>(0.5);
  const [selectedResult, setSelectedResult] = useState<ExternalSource | null>(null);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [allResults, setAllResults] = useState<ExternalSource[]>([]);
  const [activeResultsTab, setActiveResultsTab] = useState<'all' | 'knowledge' | 'web' | 'node'>('all');
  const [isLoading, setIsLoading] = useState(false);
  
  // Ensure storage buckets exist on component mount
  useEffect(() => {
    ensureStorageBucketsExist()
      .catch(err => console.error('Failed to initialize storage buckets:', err));
  }, []);
  
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
    
    // Create an array of promises to run in parallel
    const searchPromises = [];
    
    // Always query knowledge base
    searchPromises.push(
      queryKnowledgeBase({
        query: searchQuery,
        limit: 10,
        useEmbeddings,
        matchThreshold,
        includeNodes: includeNodeResults // New parameter
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
    setIsLoading(false);
    setActiveResultsTab('all');
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
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Management</h1>
        </div>
        <p className="text-muted-foreground">
          Upload, search, and manage your knowledge base
        </p>
      </div>
      
      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Search Knowledge</TabsTrigger>
          <TabsTrigger value="library">
            <span className="flex items-center gap-1">
              <Library className="h-4 w-4" />
              Knowledge Library
            </span>
          </TabsTrigger>
          <TabsTrigger value="engines">
            <span className="flex items-center gap-1">
              <Cog className="h-4 w-4" />
              Knowledge Engines
            </span>
          </TabsTrigger>
          <TabsTrigger value="upload">Upload Knowledge</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="space-y-6">
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
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Sliders className="h-4 w-4" />
                          Search Options
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Knowledge Base Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup 
                          value={useEmbeddings ? "semantic" : "text"} 
                          onValueChange={(value) => setUseEmbeddings(value === "semantic")}
                        >
                          <DropdownMenuRadioItem value="semantic">
                            Semantic Search (AI)
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="text">
                            Text Search (Exact Match)
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                        
                        {useEmbeddings && (
                          <>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-2">
                              <div className="mb-1 flex justify-between">
                                <Label htmlFor="threshold" className="text-xs">
                                  Similarity Threshold: {matchThreshold}
                                </Label>
                              </div>
                              <input 
                                id="threshold"
                                type="range" 
                                min="0.1" 
                                max="0.9" 
                                step="0.1" 
                                value={matchThreshold}
                                onChange={(e) => setMatchThreshold(parseFloat(e.target.value))}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>More Results</span>
                                <span>Exact Match</span>
                              </div>
                            </div>
                          </>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Sources</DropdownMenuLabel>
                        
                        {/* Knowledge nodes option */}
                        <DropdownMenuCheckboxItem
                          checked={includeNodeResults}
                          onCheckedChange={setIncludeNodeResults}
                        >
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            <span>Include Knowledge Nodes</span>
                          </div>
                        </DropdownMenuCheckboxItem>
                        
                        {/* Web results option */}
                        <DropdownMenuCheckboxItem
                          checked={includeWebResults}
                          onCheckedChange={setIncludeWebResults}
                        >
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>Include Google Search</span>
                          </div>
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                /* Results container */
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
                    onSaveResult={handleSaveResult}
                  />
                </div>
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
        </TabsContent>
        
        <TabsContent value="library">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5" />
                Knowledge Library
              </CardTitle>
              <CardDescription>
                Browse and manage all your uploaded knowledge items
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <KnowledgeLibrary />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="engines">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" />
                Knowledge Engines
              </CardTitle>
              <CardDescription>
                Explore the available knowledge engines and their capabilities
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <KnowledgeEngines />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="upload">
          <KnowledgeUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeManagement;
