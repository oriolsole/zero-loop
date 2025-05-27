
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { FileUploadProgress, KnowledgeUploadOptions } from './types';

/**
 * Hook for uploading knowledge to the knowledge base
 */
export function useKnowledgeUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress | null>(null);
  
  /**
   * Upload knowledge to the knowledge base
   */
  const uploadKnowledge = async (options: KnowledgeUploadOptions): Promise<boolean | { backgroundProcessing: boolean; uploadId: string }> => {
    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(null);
    
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
          fileName: file.name,
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
        
        // Update progress based on file type
        const isPDF = file.type.includes('pdf');
        setUploadProgress({
          fileName: file.name,
          status: 'processing',
          progress: 30,
          message: isPDF ? 'Extracting text from PDF...' : 'Processing content...'
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
        
        // Handle background processing
        if (data.backgroundProcessing && data.uploadId) {
          return {
            backgroundProcessing: true,
            uploadId: data.uploadId
          };
        }
        
        // Show success message with processing details
        const processingMethod = data.processingMethod || 'unknown';
        const extractedLength = data.extractedLength || 0;
        
        let successMessage = 'File uploaded and processed successfully';
        if (isPDF) {
          if (processingMethod.includes('ocr')) {
            successMessage += ' using OCR';
          } else if (processingMethod.includes('text')) {
            successMessage += ' with text extraction';
          }
        }
        
        if (extractedLength > 0) {
          successMessage += ` (${Math.round(extractedLength / 1000)}k characters extracted)`;
        }
        
        toast.success(successMessage);
        return true;
      }
      // Handle text content upload
      else if (options.content) {
        setUploadProgress({
          fileName: options.title,
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
        
        // Handle background processing
        if (data.backgroundProcessing && data.uploadId) {
          return {
            backgroundProcessing: true,
            uploadId: data.uploadId
          };
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
  
  return {
    uploadKnowledge,
    isUploading,
    uploadError,
    uploadProgress
  };
}
