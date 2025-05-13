
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { ExternalSource, FileUploadProgress, KnowledgeQueryOptions, KnowledgeUploadOptions } from './types';

/**
 * Main hook for interacting with the knowledge base
 */
export function useKnowledgeBase() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchMode, setSearchMode] = useState<'semantic' | 'text'>('semantic');

  /**
   * Upload knowledge to the knowledge base
   */
  const uploadKnowledge = async (options: KnowledgeUploadOptions): Promise<boolean> => {
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress({ status: 'pending', progress: 0 });
    
    try {
      // Handle file upload
      if (options.file) {
        const file = options.file;
        
        // Check file size
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          setUploadError('File size exceeds the 10MB limit');
          toast.error('File size exceeds the 10MB limit');
          return false;
        }
        
        setUploadProgress({
          status: 'processing',
          progress: 10,
          message: 'Reading file...'
        });
        
        // Read file as base64
        const reader = new FileReader();
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        setUploadProgress({
          status: 'processing',
          progress: 30,
          message: 'Extracting content...'
        });
        
        // Upload file and get it processed
        const { data, error } = await supabase.functions.invoke('upload-knowledge', {
          body: {
            contentType: 'file',
            title: options.title,
            fileBase64,
            fileType: file.type,
            fileName: file.name,
            fileSize: file.size,
            metadata: options.metadata || {},
            domain_id: options.domainId,
            source_url: options.sourceUrl,
            chunk_size: options.chunkSize || 1000,
            overlap: options.overlap || 100
          }
        });
        
        if (error) {
          console.error('Error uploading file:', error);
          setUploadError(error.message || 'Failed to upload file');
          toast.error('Failed to upload file');
          return false;
        }
        
        if (!data.success) {
          setUploadError(data.error || 'Failed to process file');
          toast.error(data.error || 'Failed to process file');
          return false;
        }
        
        toast.success('File uploaded and processed successfully');
        return true;
      }
      // Handle text content upload
      else if (options.content) {
        setUploadProgress({
          status: 'processing',
          progress: 30,
          message: 'Processing text content...'
        });
        
        const { data, error } = await supabase.functions.invoke('upload-knowledge', {
          body: {
            contentType: 'text',
            title: options.title,
            content: options.content,
            metadata: options.metadata || {},
            domain_id: options.domainId,
            source_url: options.sourceUrl,
            chunk_size: options.chunkSize || 1000,
            overlap: options.overlap || 100
          }
        });
        
        if (error) {
          console.error('Error uploading knowledge:', error);
          setUploadError(error.message || 'Failed to upload knowledge');
          toast.error('Failed to upload knowledge');
          return false;
        }
        
        if (!data.success) {
          setUploadError(data.error || 'Failed to upload knowledge');
          toast.error(data.error || 'Failed to upload knowledge');
          return false;
        }
        
        toast.success('Knowledge uploaded successfully');
        return true;
      } else {
        setUploadError('Either content or file must be provided');
        toast.error('Either content or file must be provided');
        return false;
      }
    } catch (error) {
      console.error('Exception when uploading knowledge:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadError(errorMessage);
      toast.error('Failed to upload knowledge');
      return false;
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };
  
  /**
   * Query the knowledge base
   */
  const queryKnowledge = async (options: KnowledgeQueryOptions): Promise<any[]> => {
    setIsQuerying(true);
    setQueryError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('query-knowledge-base', {
        body: {
          query: options.query,
          limit: options.limit || 5,
          useEmbeddings: options.useEmbeddings !== false,
          matchThreshold: options.matchThreshold || 0.5
        }
      });
      
      if (error) {
        console.error('Error querying knowledge base:', error);
        setQueryError(error.message || 'Failed to query knowledge base');
        toast.error('Failed to access knowledge base');
        return [];
      }
      
      if (data.error) {
        setQueryError(data.error);
        toast.error('Knowledge base error: ' + data.error);
        return [];
      }
      
      const results = data.results || [];
      setSearchResults(results);
      setSearchMode(options.useEmbeddings !== false ? 'semantic' : 'text');
      
      return results;
    } catch (error) {
      console.error('Exception when querying knowledge base:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setQueryError(errorMessage);
      toast.error('Failed to access knowledge base');
      return [];
    } finally {
      setIsQuerying(false);
    }
  };
  
  return {
    // Upload capabilities
    uploadKnowledge,
    isUploading,
    uploadError,
    uploadProgress,
    
    // Query capabilities
    queryKnowledge,
    isQuerying,
    queryError,
    searchResults,
    searchMode,
  };
}

export type { ExternalSource, FileUploadProgress, KnowledgeQueryOptions, KnowledgeUploadOptions };
