
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

/**
 * Ensures the required storage buckets exist
 * Should be called during app initialization
 * Note: Creating buckets requires admin privileges. 
 * In most cases, buckets should be created via migrations rather than client-side code.
 */
export const ensureStorageBucketsExist = async (): Promise<boolean> => {
  try {
    // Check if knowledge_files bucket exists
    const { data: buckets, error } = await supabase
      .storage
      .listBuckets();
    
    if (error) {
      console.error('Error checking storage buckets:', error);
      return false;
    }
    
    const knowledgeBucketExists = buckets.some(bucket => bucket.name === 'knowledge_files');
    
    if (!knowledgeBucketExists) {
      // Try to create the bucket
      const { error: createError } = await supabase
        .storage
        .createBucket('knowledge_files', {
          public: true,
        });
      
      if (createError) {
        // Check if the error is due to RLS policies (which likely means the bucket already exists
        // but the current user doesn't have permission to see it)
        if (createError.message?.includes('violates row-level security policy')) {
          console.log('Bucket likely exists but current user lacks permission to create/view it');
          // We'll assume the bucket exists and continue
          return true;
        }
        
        console.error('Error creating knowledge_files bucket:', createError);
        return false;
      }
      
      console.log('Created knowledge_files storage bucket');
    }
    
    return true;
  } catch (error) {
    console.error('Exception checking/creating storage buckets:', error);
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
