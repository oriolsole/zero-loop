
import React from 'react';
import { FileUp, File, Image as ImageIcon } from "lucide-react";

interface FileUploadPreviewProps {
  selectedFile: File | null;
  fileContent: string | null;
  fileName: string | null;
}

export const FileUploadPreview: React.FC<FileUploadPreviewProps> = ({ 
  selectedFile, 
  fileContent,
  fileName 
}) => {
  // Helper to render file icon based on type
  const renderFileIcon = () => {
    if (!selectedFile) return <FileUp className="h-10 w-10" />;
    
    if (selectedFile.type.includes('pdf')) {
      return <File className="h-10 w-10 text-red-500" />;
    } else if (selectedFile.type.includes('image')) {
      return <ImageIcon className="h-10 w-10 text-blue-500" />;
    } else {
      return <File className="h-10 w-10 text-gray-500" />;
    }
  };

  return (
    <>
      {fileContent && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">File Preview</label>
          <div className="border rounded-md p-4 bg-muted/30 mt-1 max-h-[200px] overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap">{fileContent}</pre>
          </div>
        </div>
      )}
      
      {selectedFile && selectedFile.type.includes('image') && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Image Preview</label>
          <div className="border rounded-md p-4 bg-muted/30 mt-1 flex justify-center">
            <img 
              src={URL.createObjectURL(selectedFile)} 
              alt="Preview" 
              className="max-h-[200px] object-contain" 
            />
          </div>
        </div>
      )}
    </>
  );
};
