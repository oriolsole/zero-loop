
import React, { useState } from 'react';
import { format } from 'date-fns';
import { useKnowledgeLibrary, KnowledgeItem, KnowledgeLibraryFilters } from '@/hooks/knowledge/useKnowledgeLibrary';
import { useLoopStore } from '@/store/useLoopStore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FileText, File, Search, Filter, ArrowDownAZ, Clock, SlidersHorizontal, Loader2 } from "lucide-react";
import FileThumbnail from "./FileThumbnail";

const KnowledgeLibrary: React.FC = () => {
  const { domains } = useLoopStore();
  const { 
    items, 
    isLoading, 
    error, 
    totalCount,
    filters,
    fetchKnowledgeItems, 
    deleteKnowledgeItem,
  } = useKnowledgeLibrary();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  
  // Handle delete confirmation
  const handleDeleteItem = async (id: string) => {
    setDeletingItemId(id);
    const success = await deleteKnowledgeItem(id);
    setDeletingItemId(null);
  };
  
  // Apply filters
  const handleApplyFilters = () => {
    const newFilters: KnowledgeLibraryFilters = {
      ...filters,
      searchQuery: searchQuery || undefined,
    };
    
    fetchKnowledgeItems(itemsPerPage, 0, newFilters);
    setCurrentPage(0);
  };
  
  // Handle sort change
  const handleSortChange = (value: string) => {
    const [sortBy, sortDirection] = value.split('-') as ['created_at' | 'title', 'asc' | 'desc'];
    
    const newFilters: KnowledgeLibraryFilters = {
      ...filters,
      sortBy,
      sortDirection,
    };
    
    fetchKnowledgeItems(itemsPerPage, 0, newFilters);
    setCurrentPage(0);
  };
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    fetchKnowledgeItems(itemsPerPage, newPage);
    setCurrentPage(newPage);
  };

  // Get file type icon
  const getFileIcon = (item: KnowledgeItem) => {
    if (!item.original_file_type) return <FileText className="h-5 w-5 text-muted-foreground" />;
    
    if (item.original_file_type.includes('pdf')) {
      return <File className="h-5 w-5 text-red-500" />;
    } else if (item.original_file_type.includes('image')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    } else if (item.original_file_type.includes('text') || item.original_file_type.includes('markdown')) {
      return <FileText className="h-5 w-5 text-gray-500" />;
    } else {
      return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  // Format file size to display
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'N/A';
    
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Get domain name from ID
  const getDomainName = (domainId?: string | null) => {
    if (!domainId) return 'No Domain';
    
    const domain = domains.find(d => d.id === domainId);
    return domain ? domain.name : 'Unknown Domain';
  };

  // Render content based on loading state
  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="w-full">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-[80px]" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Search knowledge items..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-[300px]"
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleApplyFilters}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          className="ml-auto"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
        </Button>
        
        <Select defaultValue="created_at-desc" onValueChange={handleSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at-desc">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Newest first
              </div>
            </SelectItem>
            <SelectItem value="created_at-asc">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Oldest first
              </div>
            </SelectItem>
            <SelectItem value="title-asc">
              <div className="flex items-center gap-2">
                <ArrowDownAZ className="h-4 w-4" />
                Title (A-Z)
              </div>
            </SelectItem>
            <SelectItem value="title-desc">
              <div className="flex items-center gap-2">
                <ArrowDownAZ className="h-4 w-4" />
                Title (Z-A)
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Additional filters - Removed domain filter but kept the filters container */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/20 rounded-md">
          <div className="text-sm text-muted-foreground">
            Additional filters will appear here
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="py-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium">No knowledge items found</h3>
          <p className="text-muted-foreground mt-1">
            Try uploading some content or adjusting your filters
          </p>
          
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => fetchKnowledgeItems()}
          >
            Refresh
          </Button>
        </div>
      )}
      
      {/* Items grid */}
      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="group">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <FileThumbnail 
                    fileType={item.original_file_type || undefined}
                    thumbnailUrl={item.thumbnail_path || undefined}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-1 text-xs mt-1">
                      {item.domain_id && (
                        <Badge variant="secondary" className="mr-1">
                          {getDomainName(item.domain_id)}
                        </Badge>
                      )}
                      
                      {item.created_at && (
                        <CardDescription className="inline-block">
                          Added {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={deletingItemId === item.id}
                    >
                      {deletingItemId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete knowledge item?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently remove this item and any associated files from your knowledge base.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-24 w-full rounded-md border p-2">
                <div className="text-sm text-muted-foreground">
                  {item.content}
                </div>
              </ScrollArea>
            </CardContent>
            
            <CardFooter className="pt-2 flex justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {item.source_url && (
                  <span>Source: {item.source_url}</span>
                )}
                
                {item.original_file_type && (
                  <Badge variant="outline" className="mr-1">
                    {item.original_file_type}
                  </Badge>
                )}
                
                {item.file_size && (
                  <span>{formatFileSize(item.file_size)}</span>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Pagination */}
      {totalCount > itemsPerPage && (
        <div className="flex justify-center my-6">
          <div className="join">
            {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }).map((_, i) => (
              <Button
                key={i}
                variant={i === currentPage ? "default" : "outline"}
                size="sm"
                className="mx-1"
                onClick={() => handlePageChange(i)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeLibrary;
