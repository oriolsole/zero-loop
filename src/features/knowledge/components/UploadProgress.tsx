
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { UploadProgress as ProgressType } from '../types';

interface UploadProgressProps {
  progress: ProgressType;
}

export function UploadProgress({ progress }: UploadProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{progress.message || getStatusMessage(progress.status)}</span>
        </div>
        <span className="text-sm font-medium">{progress.progress}%</span>
      </div>
      <Progress value={progress.progress} className="h-2" />
    </div>
  );
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'Preparing upload...';
    case 'processing':
      return 'Processing content...';
    case 'embedding':
      return 'Generating AI embeddings...';
    case 'saving':
      return 'Saving to knowledge base...';
    case 'complete':
      return 'Upload complete!';
    case 'error':
      return 'Upload failed';
    default:
      return 'Uploading...';
  }
}
