
import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, Filter } from 'lucide-react';

interface MCPToolsSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: 'all' | 'default' | 'custom';
  onFilterChange: (filter: 'all' | 'default' | 'custom') => void;
  selectedCategory?: string;
  onCategoryChange: (category: string | undefined) => void;
  categories: string[];
  totalCount: number;
  filteredCount: number;
}

const MCPToolsSearch: React.FC<MCPToolsSearchProps> = ({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  selectedCategory,
  onCategoryChange,
  categories,
  totalCount,
  filteredCount
}) => {
  const clearFilters = () => {
    onSearchChange('');
    onFilterChange('all');
    onCategoryChange(undefined);
  };

  const hasActiveFilters = searchQuery || filter !== 'all' || selectedCategory;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tools by name, description, or tags..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Type:</span>
        </div>
        
        <Badge 
          variant={filter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => onFilterChange('all')}
        >
          All
        </Badge>
        <Badge 
          variant={filter === 'default' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => onFilterChange('default')}
        >
          Default
        </Badge>
        <Badge 
          variant={filter === 'custom' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => onFilterChange('custom')}
        >
          Custom
        </Badge>

        {/* Category Filters */}
        {categories.length > 0 && (
          <>
            <div className="h-4 w-px bg-border mx-2" />
            <span className="text-sm font-medium">Category:</span>
            {categories.map(category => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => onCategoryChange(selectedCategory === category ? undefined : category)}
              >
                {category}
              </Badge>
            ))}
          </>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <>
            <div className="h-4 w-px bg-border mx-2" />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              Clear filters
            </Button>
          </>
        )}

        {/* Results Count */}
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredCount} of {totalCount} tools
        </div>
      </div>
    </div>
  );
};

export default MCPToolsSearch;
