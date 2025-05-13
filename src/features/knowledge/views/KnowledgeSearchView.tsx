
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from "@/components/ui/badge";
import { Search, Info, Loader2, Sliders } from 'lucide-react';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';
import ExternalSources from '@/components/ExternalSources';

export function KnowledgeSearchView() {
  const { 
    queryKnowledgeBase, 
    isQuerying, 
    queryError, 
    searchResults,
    searchMode
  } = useKnowledgeBase();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [useEmbeddings, setUseEmbeddings] = useState<boolean>(true);
  const [matchThreshold, setMatchThreshold] = useState<number>(0.5);
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    try {
      await queryKnowledgeBase({
        query: searchQuery,
        limit: 10,
        useEmbeddings,
        matchThreshold
      });
      
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Knowledge Base
          </CardTitle>
          <CardDescription>
            Search your existing knowledge to see what's already stored
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
                    <DropdownMenuLabel>Search Method</DropdownMenuLabel>
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
                <Button type="submit" disabled={isQuerying || !searchQuery.trim()}>
                  {isQuerying ? (
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
          {queryError && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <p className="text-red-700">{queryError}</p>
            </div>
          )}
          
          {!queryError && searchResults.length === 0 ? (
            <div className="bg-muted p-8 rounded-md text-center">
              <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-1">No results found</h3>
              <p className="text-muted-foreground">
                Try different search terms, adjusting the search method, or lowering the similarity threshold
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-medium">Knowledge Base Results</h3>
                <Badge variant={searchMode === 'semantic' ? 'default' : 'secondary'}>
                  {searchMode === 'semantic' ? 'AI Semantic Search' : 'Text Search'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Found {searchResults.length} results for "{searchQuery}"
                </span>
              </div>
              <ExternalSources 
                sources={searchResults}
                title="Knowledge Base Results"
                description={`Found ${searchResults.length} results for "${searchQuery}"`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
