
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export interface UploadProgressData {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  title: string;
  error_details?: string;
  created_at: string;
  completed_at?: string;
}

export const useUploadProgress = () => {
  const [activeUploads, setActiveUploads] = useState<Map<string, UploadProgressData>>(new Map());
  const [isPolling, setIsPolling] = useState(false);

  const addUpload = useCallback((uploadId: string, title: string) => {
    setActiveUploads(prev => new Map(prev).set(uploadId, {
      id: uploadId,
      status: 'processing',
      progress: 0,
      title,
      created_at: new Date().toISOString()
    }));
  }, []);

  const removeUpload = useCallback((uploadId: string) => {
    setActiveUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(uploadId);
      return newMap;
    });
  }, []);

  const pollUploadProgress = useCallback(async (uploadId: string) => {
    try {
      const { data, error } = await supabase
        .from('upload_progress')
        .select('*')
        .eq('id', uploadId)
        .single();

      if (error) {
        console.error('Error polling upload progress:', error);
        return null;
      }

      return data as UploadProgressData;
    } catch (error) {
      console.error('Exception polling upload progress:', error);
      return null;
    }
  }, []);

  const startPolling = useCallback((uploadId: string, title: string) => {
    addUpload(uploadId, title);
    setIsPolling(true);

    const pollInterval = setInterval(async () => {
      const progress = await pollUploadProgress(uploadId);
      
      if (progress) {
        setActiveUploads(prev => new Map(prev).set(uploadId, progress));

        if (progress.status === 'completed') {
          clearInterval(pollInterval);
          toast.success(`Upload completed: ${progress.title}`);
          
          // Remove after a delay to show completion
          setTimeout(() => removeUpload(uploadId), 3000);
        } else if (progress.status === 'failed') {
          clearInterval(pollInterval);
          toast.error(`Upload failed: ${progress.title}`, {
            description: progress.error_details
          });
          
          // Remove after a delay to show error
          setTimeout(() => removeUpload(uploadId), 5000);
        }
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup after 10 minutes max
    setTimeout(() => {
      clearInterval(pollInterval);
      removeUpload(uploadId);
    }, 10 * 60 * 1000);

    return () => clearInterval(pollInterval);
  }, [addUpload, removeUpload, pollUploadProgress]);

  useEffect(() => {
    // Set polling state based on active uploads
    setIsPolling(activeUploads.size > 0);
  }, [activeUploads.size]);

  return {
    activeUploads: Array.from(activeUploads.values()),
    isPolling,
    startPolling,
    removeUpload
  };
};
