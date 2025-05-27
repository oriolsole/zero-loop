
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { FileUploadProgress } from "@/hooks/knowledge/types";

interface UploadProgressProps {
  progress: FileUploadProgress;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ progress }) => {
  const getStatusColor = () => {
    switch (progress.status) {
      case 'processing': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-2 mt-4">
      <div className="flex justify-between text-xs">
        <span className={getStatusColor()}>{progress.status}</span>
        <span>{Math.round(progress.progress)}%</span>
      </div>
      <Progress value={progress.progress} className="h-2" />
      {progress.message && (
        <p className="text-xs text-muted-foreground">{progress.message}</p>
      )}
      {progress.fileName && (
        <p className="text-xs text-muted-foreground">File: {progress.fileName}</p>
      )}
    </div>
  );
};
