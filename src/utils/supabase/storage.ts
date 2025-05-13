
import { supabase } from '@/integrations/supabase/client';

/**
 * Get the public URL for a file in a storage bucket
 */
export async function getPublicFileUrl(bucket: string, fileName: string): Promise<string> {
  try {
    const { data } = await supabase
      .storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting public URL:', error);
    return '';
  }
}

/**
 * Ensure storage buckets exist
 */
export async function ensureStorageBucketsExist(): Promise<boolean> {
  try {
    // Check if knowledge_files bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const knowledgeBucketExists = buckets?.some(bucket => bucket.name === 'knowledge_files');
    
    // Create bucket if it doesn't exist
    if (!knowledgeBucketExists) {
      const { error } = await supabase.storage.createBucket('knowledge_files', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/gif',
          'text/plain',
          'text/markdown',
          'text/csv'
        ]
      });
      
      if (error) {
        console.error('Error creating storage bucket:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring storage buckets exist:', error);
    return false;
  }
}

/**
 * Check if the current user has access to a storage bucket
 */
export async function checkStorageBucketAccess(bucket: string): Promise<boolean> {
  try {
    // Try to list files to check access
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .list('', { limit: 1 });
    
    return !error && !!data;
  } catch {
    return false;
  }
}
