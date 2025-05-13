
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchIcon, ExternalLink, Loader2 } from 'lucide-react';
import { useKnowledgeBase } from '@/hooks/knowledge/useKnowledgeBase';

export default function KnowledgeSearchView() {
  const [query, setQuery] = useState('');
  const { queryKnowledge, isQuerying, searchResults, searchMode } = useKnowledgeBase();
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    await queryKnowledge({
      query,
      limit: 10,
      useEmbeddings: true
    });
  };
  
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search the knowledge base..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={isQuerying || !query.trim()}
          >
            {isQuerying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SearchIcon className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Search</span>
          </Button>
        </form>
        
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Search results</h3>
              <span className="text-xs text-muted-foreground">
                Using {searchMode === 'semantic' ? 'semantic' : 'text'} search
              </span>
            </div>
            
            <div className="space-y-4">
              {searchResults.map((result) => (
                <div key={result.id} className="border rounded-md p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-medium">{result.title}</h4>
                    {result.link && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6" 
                        asChild
                      >
                        <a 
                          href={result.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Open source"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {result.snippet || result.content}
                    </p>
                  </div>
                  
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                    <span>{result.source}</span>
                    {result.date && <span>• {result.date}</span>}
                    {result.relevanceScore !== undefined && (
                      <span>• {Math.round(result.relevanceScore * 100)}% match</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!isQuerying && query && searchResults.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No results found for "{query}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
