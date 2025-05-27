
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
  updated_at: string;
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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

      // Cast the status to the correct type since we know it should be one of these values
      return {
        ...data,
        status: data.status as 'processing' | 'completed' | 'failed'
      } as UploadProgressData;
    } catch (error) {
      console.error('Exception polling upload progress:', error);
      return null;
    }
  }, []);

  // Check if an upload is stalled (no updates for 5+ minutes)
  const isUploadStalled = useCallback((upload: UploadProgressData): boolean => {
    if (upload.status !== 'processing') return false;
    
    const lastUpdate = new Date(upload.updated_at || upload.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdate.getTime();
    const fiveMinutes = 5 * 60 * 1000;
    
    return timeDiff > fiveMinutes;
  }, []);

  // Mark a stalled upload as failed
  const markUploadAsFailed = useCallback(async (uploadId: string, reason: string = 'Upload stalled - no progress for 5+ minutes') => {
    try {
      await supabase
        .from('upload_progress')
        .update({
          status: 'failed',
          error_details: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', uploadId);
      
      console.log(`Marked stalled upload ${uploadId} as failed`);
    } catch (error) {
      console.error('Error marking upload as failed:', error);
    }
  }, []);

  const startPollingForUpload = useCallback((uploadId: string, title: string) => {
    // Clear any existing interval for this upload
    const existingInterval = pollIntervals.get(uploadId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    addUpload(uploadId, title);

    let stallCheckCount = 0;
    const maxStallChecks = 5; // Allow 5 stall checks before giving up

    const interval = setInterval(async () => {
      const progress = await pollUploadProgress(uploadId);
      
      if (progress) {
        // Check if upload is stalled
        if (isUploadStalled(progress)) {
          stallCheckCount++;
          console.log(`Upload ${uploadId} appears stalled (check ${stallCheckCount}/${maxStallChecks})`);
          
          if (stallCheckCount >= maxStallChecks) {
            // Mark as failed and stop polling
            await markUploadAsFailed(uploadId);
            clearInterval(interval);
            setPollIntervals(prev => {
              const newIntervals = new Map(prev);
              newIntervals.delete(uploadId);
              return newIntervals;
            });
            toast.error(`Upload "${title}" failed - stalled for too long`);
            setTimeout(() => removeUpload(uploadId), 3000);
            return;
          }
        } else {
          // Reset stall counter if we got an update
          stallCheckCount = 0;
        }

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
      } else {
        // If we can't fetch progress, increment stall counter
        stallCheckCount++;
        if (stallCheckCount >= maxStallChecks) {
          clearInterval(interval);
          setPollIntervals(prev => {
            const newIntervals = new Map(prev);
            newIntervals.delete(uploadId);
            return newIntervals;
          });
          toast.error(`Upload "${title}" failed - unable to track progress`);
          setTimeout(() => removeUpload(uploadId), 3000);
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
  }, [addUpload, removeUpload, pollUploadProgress, pollIntervals, isUploadStalled, markUploadAsFailed]);

  const startPolling = useCallback((uploadId: string, title: string) => {
    startPollingForUpload(uploadId, title);
  }, [startPollingForUpload]);

  // Manual stop function for users
  const stopTracking = useCallback((uploadId: string) => {
    const upload = activeUploads.get(uploadId);
    if (upload) {
      toast.info(`Stopped tracking: ${upload.title}`);
    }
    removeUpload(uploadId);
  }, [activeUploads, removeUpload]);

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
        console.log(`Found ${data.length} active uploads, checking for stalled ones...`);
        
        let resumedCount = 0;
        let stalledCount = 0;

        // Check each upload and resume or mark as failed
        for (const upload of data) {
          // Cast the status to the correct type
          const typedUpload = {
            ...upload,
            status: upload.status as 'processing' | 'completed' | 'failed'
          } as UploadProgressData;
          
          // Check if upload is too old (more than 10 minutes)
          const uploadTime = new Date(typedUpload.created_at).getTime();
          const now = Date.now();
          const tenMinutesAgo = now - (10 * 60 * 1000);
          
          if (uploadTime < tenMinutesAgo || isUploadStalled(typedUpload)) {
            // Mark old or stalled uploads as failed
            await markUploadAsFailed(typedUpload.id, 'Upload timed out or stalled');
            stalledCount++;
          } else {
            // Resume polling for recent uploads
            startPollingForUpload(typedUpload.id, typedUpload.title);
            resumedCount++;
          }
        }

        if (resumedCount > 0) {
          toast.info(`Resumed tracking ${resumedCount} background upload(s)`);
        }
        if (stalledCount > 0) {
          toast.warning(`Stopped tracking ${stalledCount} stalled upload(s)`);
        }
      }
    } catch (error) {
      console.error('Error fetching active uploads:', error);
    }
  }, [startPollingForUpload, isUploadStalled, markUploadAsFailed]);

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
    removeUpload,
    stopTracking
  };
};
