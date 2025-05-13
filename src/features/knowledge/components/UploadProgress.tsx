
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { UploadProgress as ProgressType } from '../types';

interface UploadProgressProps {
  progress: ProgressType;
}

export function UploadProgress({ progress }: UploadProgressProps) {
  const getStatusColor = () => {
    switch (progress.status) {
      case 'error':
        return 'text-destructive';
      case 'complete':
        return 'text-green-600';
      default:
        return 'text-muted-foreground';
    }
  };
  
  return (
    <div className="space-y-2 mt-4">
      <div className="flex justify-between text-xs">
        <span className={getStatusColor()}>
          {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
        </span>
        <span>{Math.round(progress.progress)}%</span>
      </div>
      <Progress 
        value={progress.progress} 
        className="h-2"
        color={progress.status === 'error' ? 'bg-destructive' : undefined}
      />
      {progress.message && (
        <p className={`text-xs ${getStatusColor()}`}>{progress.message}</p>
      )}
    </div>
  );
}
