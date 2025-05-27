
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

/**
 * Check if storage buckets exist (read-only check)
 * Note: Buckets should be created via migrations, not client-side
 */
export const checkStorageBucketsExist = async (): Promise<boolean> => {
  try {
    // Just check if we can list buckets (this tests if the bucket exists and we have access)
    const { data: buckets, error } = await supabase
      .storage
      .listBuckets();
    
    if (error) {
      console.error('Error checking storage buckets:', error);
      return false;
    }
    
    const knowledgeBucketExists = buckets.some(bucket => bucket.name === 'knowledge_files');
    
    if (!knowledgeBucketExists) {
      console.warn('knowledge_files bucket does not exist. Please create it via SQL migrations.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception checking storage buckets:', error);
    return false;
  }
};

/**
 * Get a public URL for a file in storage
 */
export const getPublicFileUrl = (bucketName: string, fileName: string): string => {
  const { data } = supabase
    .storage
    .from(bucketName)
    .getPublicUrl(fileName);
  
  return data.publicUrl;
};

/**
 * Delete a file from storage
 */
export const deleteFile = async (bucketName: string, filePath: string): Promise<boolean> => {
  try {
    // Extract the filename from the path if needed
    const fileName = filePath.includes('/') 
      ? filePath.substring(filePath.lastIndexOf('/') + 1)
      : filePath;
    
    const { error } = await supabase
      .storage
      .from(bucketName)
      .remove([fileName]);
    
    if (error) {
      console.error(`Error deleting file ${fileName} from ${bucketName}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception deleting file:', error);
    return false;
  }
};

// Note: ensureStorageBucketsExist function removed - buckets should be created via SQL migrations
export const ensureStorageBucketsExist = checkStorageBucketsExist;
