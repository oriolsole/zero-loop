
import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";

interface SubmitButtonProps {
  isUploading: boolean;
  isDisabled: boolean;
  isFileUpload: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isUploading,
  isDisabled,
  isFileUpload
}) => {
  return (
    <Button 
      type="submit" 
      disabled={isUploading || isDisabled} 
      className="w-full"
    >
      {isUploading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isFileUpload ? 'Uploading File...' : 'Uploading...'}
        </>
      ) : (
        <>
          <Upload className="mr-2 h-4 w-4" />
          {isFileUpload ? 'Upload File' : 'Upload Knowledge'}
        </>
      )}
    </Button>
  );
};
