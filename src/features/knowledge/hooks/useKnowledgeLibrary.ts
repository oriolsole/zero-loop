
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import { KnowledgeItem, KnowledgeLibraryFilters } from '../types';

/**
 * Hook for managing the knowledge library
 */
export function useKnowledgeLibrary() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<KnowledgeLibraryFilters>({
    sortBy: 'created_at',
    sortDirection: 'desc',
  });
  
  /**
   * Fetch knowledge items with optional filtering
   */
  const fetchKnowledgeItems = async (
    pageSize: number = 20,
    pageIndex: number = 0,
    newFilters?: KnowledgeLibraryFilters
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const activeFilters = newFilters || filters;
      
      // Start building the query
      let query = supabase
        .from('knowledge_chunks')
        .select('*', { count: 'exact' });
      
      // Apply domain filter if specified
      if (activeFilters.domainId) {
        query = query.eq('domain_id', activeFilters.domainId);
      }
      
      // Apply file type filter if specified
      if (activeFilters.fileType) {
        query = query.eq('original_file_type', activeFilters.fileType);
      }
      
      // Apply search query if specified
      if (activeFilters.searchQuery) {
        const searchTerm = `%${activeFilters.searchQuery}%`;
        query = query.or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`);
      }
      
      // Apply sorting
      const sortBy = activeFilters.sortBy || 'created_at';
      const sortDirection = activeFilters.sortDirection || 'desc';
      query = query.order(sortBy, { ascending: sortDirection === 'asc' });
      
      // Apply pagination
      query = query.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);
      
      // Execute the query
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching knowledge items:', error);
        setError(error.message);
        toast({ title: "Error", description: 'Failed to fetch knowledge library', variant: "destructive" });
        return;
      }
      
      setItems(data as KnowledgeItem[]);
      if (count !== null) {
        setTotalCount(count);
      }
      
      if (newFilters) {
        setFilters(newFilters);
      }
    } catch (error) {
      console.error('Exception when fetching knowledge items:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({ title: "Error", description: 'Failed to access knowledge library', variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Delete a file from storage by path
   */
  const deleteFileFromStorage = async (filePath: string): Promise<boolean> => {
    try {
      if (!filePath) return true; // No file to delete
      
      // Extract the filename from the path if needed
      const pathParts = filePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      console.log('Deleting file from storage:', fileName);
      
      // Remove the file from the storage bucket
      const { error } = await supabase.storage
        .from('knowledge_files')
        .remove([fileName]);
      
      if (error) {
        console.error('Error removing file from storage:', error);
        return false;
      }
      
      console.log('File deleted successfully:', fileName);
      return true;
    } catch (error) {
      console.error('Exception when deleting file:', error);
      return false;
    }
  };
  
  /**
   * Delete a knowledge item by ID
   */
  const deleteKnowledgeItem = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First get the item to check if it has associated files
      const { data: item, error: fetchError } = await supabase
        .from('knowledge_chunks')
        .select('file_path, thumbnail_path')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching item details:', fetchError);
        toast({ title: "Error", description: 'Failed to get item details for deletion', variant: "destructive" });
        return false;
      }
      
      if (!item) {
        toast({ title: "Error", description: 'Item not found', variant: "destructive" });
        return false;
      }
      
      // Delete associated files if they exist
      const fileDeletePromises = [];
      
      if (item?.file_path) {
        fileDeletePromises.push(deleteFileFromStorage(item.file_path));
      }
      
      if (item?.thumbnail_path && item.thumbnail_path !== item?.file_path) {
        fileDeletePromises.push(deleteFileFromStorage(item.thumbnail_path));
      }
      
      // Wait for all file deletions to complete
      if (fileDeletePromises.length > 0) {
        const fileResults = await Promise.all(fileDeletePromises);
        if (fileResults.some(result => !result)) {
          toast({ title: "Warning", description: 'Some associated files could not be deleted', variant: "warning" });
        }
      }
      
      // Delete the database record
      const { error } = await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting knowledge item from database:', error);
        toast({ title: "Error", description: `Failed to delete item: ${error.message}`, variant: "destructive" });
        return false;
      }
      
      // Update the local state by removing the deleted item
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      
      toast({ title: "Success", description: 'Item deleted successfully' });
      return true;
    } catch (error) {
      console.error('Exception when deleting knowledge item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: "Error", description: `Failed to delete item: ${errorMessage}`, variant: "destructive" });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch items on initial load
  useEffect(() => {
    fetchKnowledgeItems();
  }, []);
  
  return {
    items,
    isLoading,
    error,
    totalCount,
    filters,
    fetchKnowledgeItems,
    deleteKnowledgeItem,
    setFilters
  };
}
