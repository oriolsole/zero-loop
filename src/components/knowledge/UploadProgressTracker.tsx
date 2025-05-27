
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, FileText, File, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useUploadProgress, UploadProgressData } from "@/hooks/knowledge/useUploadProgress";

interface UploadProgressTrackerProps {
  className?: string;
}

const UploadProgressTracker: React.FC<UploadProgressTrackerProps> = ({ className }) => {
  const { activeUploads, removeUpload } = useUploadProgress();

  if (activeUploads.length === 0) {
    return null;
  }

  const getStatusIcon = (status: UploadProgressData['status']) => {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: UploadProgressData['status']) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <File className="h-4 w-4" />
          Background Uploads ({activeUploads.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-3">
            {activeUploads.map((upload) => (
              <div key={upload.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getStatusIcon(upload.status)}
                    <span className="text-sm font-medium truncate">
                      {upload.title}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getStatusColor(upload.status)}`}
                    >
                      {upload.status}
                    </Badge>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeUpload(upload.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {upload.status === 'processing' && (
                  <div className="space-y-1">
                    <Progress value={upload.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {upload.message || 'Processing...'}
                    </p>
                  </div>
                )}
                
                {upload.status === 'failed' && upload.error_details && (
                  <p className="text-xs text-red-600">
                    {upload.error_details}
                  </p>
                )}
                
                {upload.status === 'completed' && (
                  <p className="text-xs text-green-600">
                    Upload completed successfully
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default UploadProgressTracker;
