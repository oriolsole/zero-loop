
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Download, File, FileText, Image, Trash2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useKnowledgeLibrary } from '../hooks/useKnowledgeLibrary';
import { KnowledgeItem } from '../types';

export function KnowledgeLibraryView() {
  const { items, isLoading, error, totalCount, filters, fetchKnowledgeItems, deleteKnowledgeItem } = useKnowledgeLibrary();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'created_at',
    direction: 'desc'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeItem | null>(null);
  const [itemOpened, setItemOpened] = useState<KnowledgeItem | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<Record<string, boolean>>({});
  
  const { user } = useAuth();
  
  // Helper function to get file URL synchronously
  const getFileDownloadUrl = (filePath?: string | null): string => {
    if (!filePath) return '#';
    const fileName = filePath.split('/').pop() || '';
    return `https://dwescgkujhhizyrokuiv.supabase.co/storage/v1/object/public/knowledge_files/${fileName}`;
  };
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKnowledgeItems(20, 0, {
      ...filters,
      searchQuery: searchQuery
    });
  };
  
  // Handle file type filter change
  const handleFileTypeChange = (value: string) => {
    setFileTypeFilter(value);
    fetchKnowledgeItems(20, 0, {
      ...filters,
      fileType: value || undefined
    });
  };
  
  // Handle sort change
  const handleSortChange = (value: string) => {
    const [field, direction] = value.split(':');
    setSortConfig({ field, direction: direction as 'asc' | 'desc' });
    fetchKnowledgeItems(20, 0, {
      ...filters,
      sortBy: field as 'created_at' | 'title',
      sortDirection: direction as 'asc' | 'desc'
    });
  };
  
  // Open the delete confirmation dialog
  const openDeleteDialog = (item: KnowledgeItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };
  
  // Handle delete item confirmation
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    try {
      setDeleteInProgress(prev => ({ ...prev, [itemToDelete.id]: true }));
      const success = await deleteKnowledgeItem(itemToDelete.id);
      
      if (success) {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    } finally {
      setDeleteInProgress(prev => ({ ...prev, [itemToDelete.id]: false }));
    }
  };
  
  // Handle view item details
  const handleViewItem = (item: KnowledgeItem) => {
    setItemOpened(item);
  };
  
  // Format file size for display
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'N/A';
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Get appropriate icon for file type
  const getFileIcon = (fileType?: string | null) => {
    if (!fileType) return <File />;
    
    if (fileType.includes('image')) return <Image />;
    if (fileType.includes('text') || fileType.includes('pdf') || fileType.includes('doc')) return <FileText />;
    
    return <File />;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Knowledge Library
        </CardTitle>
        <CardDescription>
          Browse and manage all your uploaded knowledge items
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error loading library</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Search and filter form */}
          <form onSubmit={handleSearch} className="flex flex-col gap-4 md:flex-row">
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="Search by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              <Button type="submit" size="icon">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:w-2/3 lg:w-1/2">
              <Select value={fileTypeFilter} onValueChange={handleFileTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All file types</SelectItem>
                  <SelectItem value="text/plain">Text</SelectItem>
                  <SelectItem value="application/pdf">PDF</SelectItem>
                  <SelectItem value="image/">Images</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={`${sortConfig.field}:${sortConfig.direction}`}
                onValueChange={handleSortChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at:desc">Newest first</SelectItem>
                  <SelectItem value="created_at:asc">Oldest first</SelectItem>
                  <SelectItem value="title:asc">Title A-Z</SelectItem>
                  <SelectItem value="title:desc">Title Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
          
          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading items...</span>
              </div>
            ) : (
              <span>Found {totalCount} items</span>
            )}
          </div>
          
          {/* Knowledge items */}
          {items.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Info className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No knowledge items found</h3>
              <p className="text-muted-foreground mt-1">
                Try uploading new content or changing your search filters
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className="flex flex-col border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getFileIcon(item.original_file_type)}
                        <span className="text-xs text-muted-foreground">
                          {item.original_file_type || 'Unknown type'}
                        </span>
                      </div>
                      <Badge variant="outline">{formatFileSize(item.file_size)}</Badge>
                    </div>
                    
                    <h3 className="font-medium line-clamp-1 mb-1">{item.title}</h3>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                      {item.content}
                    </p>
                    
                    <div className="text-xs text-muted-foreground">
                      Added {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted/40 flex justify-between items-center">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewItem(item)}
                    >
                      View Details
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      {item.file_path && (
                        <Button
                          size="icon"
                          variant="ghost"
                          asChild
                          className="h-8 w-8"
                        >
                          <a 
                            href={getFileDownloadUrl(item.file_path)}
                            target="_blank" 
                            rel="noopener noreferrer"
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(item)}
                        disabled={deleteInProgress[item.id]}
                      >
                        {deleteInProgress[item.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Delete confirmation dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Knowledge Item</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{itemToDelete?.title}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={deleteInProgress[itemToDelete?.id || '']}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteItem}
                  disabled={deleteInProgress[itemToDelete?.id || '']}
                >
                  {deleteInProgress[itemToDelete?.id || ''] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Item details dialog */}
          <Dialog open={!!itemOpened} onOpenChange={(open) => !open && setItemOpened(null)}>
            {itemOpened && (
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{itemOpened.title}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {getFileIcon(itemOpened.original_file_type)}
                    <span className="text-sm">
                      {itemOpened.original_file_type || 'Unknown type'} • {formatFileSize(itemOpened.file_size)}
                    </span>
                  </div>
                  
                  {itemOpened.source_url && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Source URL:</h4>
                      <a 
                        href={itemOpened.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline"
                      >
                        {itemOpened.source_url}
                      </a>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Content:</h4>
                    <div className="max-h-96 overflow-y-auto border rounded p-3 bg-muted/40">
                      <p className="text-sm whitespace-pre-wrap">{itemOpened.content}</p>
                    </div>
                  </div>
                  
                  {itemOpened.file_path && (
                    <Button 
                      variant="outline"
                      asChild
                    >
                      <a 
                        href={getFileDownloadUrl(itemOpened.file_path)}
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download File
                      </a>
                    </Button>
                  )}
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setItemOpened(null);
                      openDeleteDialog(itemOpened);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Item
                  </Button>
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            )}
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
