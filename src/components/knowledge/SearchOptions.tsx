
import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sliders, Brain, Globe } from "lucide-react";
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

interface SearchOptionsProps {
  useEmbeddings: boolean;
  setUseEmbeddings: (value: boolean) => void;
  matchThreshold: number;
  setMatchThreshold: (value: number) => void;
  includeNodeResults: boolean;
  setIncludeNodeResults: (value: boolean) => void;
  includeWebResults: boolean;
  setIncludeWebResults: (value: boolean) => void;
}

const SearchOptions: React.FC<SearchOptionsProps> = ({
  useEmbeddings,
  setUseEmbeddings,
  matchThreshold,
  setMatchThreshold,
  includeNodeResults,
  setIncludeNodeResults,
  includeWebResults,
  setIncludeWebResults
}) => {
  return (
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
  );
};

export default SearchOptions;
