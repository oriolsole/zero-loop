
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
  const [pollIntervals, setPollIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map());

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
    
    // Clear any existing polling interval for this upload
    setPollIntervals(prev => {
      const newIntervals = new Map(prev);
      const interval = newIntervals.get(uploadId);
      if (interval) {
        clearInterval(interval);
        newIntervals.delete(uploadId);
      }
      return newIntervals;
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

  const startPollingForUpload = useCallback((uploadId: string, title: string) => {
    // Clear any existing interval for this upload
    const existingInterval = pollIntervals.get(uploadId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    addUpload(uploadId, title);

    const interval = setInterval(async () => {
      const progress = await pollUploadProgress(uploadId);
      
      if (progress) {
        setActiveUploads(prev => new Map(prev).set(uploadId, progress));

        if (progress.status === 'completed') {
          clearInterval(interval);
          setPollIntervals(prev => {
            const newIntervals = new Map(prev);
            newIntervals.delete(uploadId);
            return newIntervals;
          });
          toast.success(`Upload completed: ${progress.title}`);
          
          // Remove after a delay to show completion
          setTimeout(() => removeUpload(uploadId), 3000);
        } else if (progress.status === 'failed') {
          clearInterval(interval);
          setPollIntervals(prev => {
            const newIntervals = new Map(prev);
            newIntervals.delete(uploadId);
            return newIntervals;
          });
          toast.error(`Upload failed: ${progress.title}`, {
            description: progress.error_details
          });
          
          // Remove after a delay to show error
          setTimeout(() => removeUpload(uploadId), 5000);
        }
      }
    }, 2000); // Poll every 2 seconds

    // Store the interval
    setPollIntervals(prev => new Map(prev).set(uploadId, interval));

    // Cleanup after 10 minutes max
    setTimeout(() => {
      clearInterval(interval);
      setPollIntervals(prev => {
        const newIntervals = new Map(prev);
        newIntervals.delete(uploadId);
        return newIntervals;
      });
      removeUpload(uploadId);
    }, 10 * 60 * 1000);
  }, [addUpload, removeUpload, pollUploadProgress, pollIntervals]);

  const startPolling = useCallback((uploadId: string, title: string) => {
    startPollingForUpload(uploadId, title);
  }, [startPollingForUpload]);

  // Fetch existing active uploads on mount
  const fetchActiveUploads = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('upload_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'processing')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active uploads:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`Found ${data.length} active uploads, resuming polling...`);
        
        // Resume polling for each active upload
        data.forEach((upload) => {
          // Check if upload is not too old (less than 10 minutes)
          const uploadTime = new Date(upload.created_at).getTime();
          const now = Date.now();
          const tenMinutesAgo = now - (10 * 60 * 1000);
          
          if (uploadTime > tenMinutesAgo) {
            startPollingForUpload(upload.id, upload.title);
          } else {
            console.log(`Skipping old upload: ${upload.title}`);
          }
        });

        if (data.length > 0) {
          toast.info(`Resumed tracking ${data.length} background upload(s)`);
        }
      }
    } catch (error) {
      console.error('Error fetching active uploads:', error);
    }
  }, [startPollingForUpload]);

  // Initialize by fetching active uploads on mount
  useEffect(() => {
    fetchActiveUploads();
  }, [fetchActiveUploads]);

  useEffect(() => {
    // Set polling state based on active uploads
    setIsPolling(activeUploads.size > 0);
  }, [activeUploads.size]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      pollIntervals.forEach((interval) => {
        clearInterval(interval);
      });
    };
  }, [pollIntervals]);

  return {
    activeUploads: Array.from(activeUploads.values()),
    isPolling,
    startPolling,
    removeUpload
  };
};
