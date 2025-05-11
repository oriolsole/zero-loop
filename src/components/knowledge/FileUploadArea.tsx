
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUp, File, Image as ImageIcon } from "lucide-react";

interface FileUploadAreaProps {
  selectedFile: File | null;
  fileName: string | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  selectedFile,
  fileName,
  handleFileChange
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
    <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center">
      {renderFileIcon()}
      
      <div className="mt-4 mb-3">
        <p className="text-sm font-medium">
          {fileName || 'Drag and drop file or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports PDF, images, text files, Markdown, and CSV
        </p>
      </div>
      
      <Input 
        id="file" 
        type="file" 
        accept=".pdf,.jpg,.jpeg,.png,.gif,.txt,.md,.csv"
        onChange={handleFileChange}
        className="cursor-pointer hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => document.getElementById('file')?.click()}
      >
        Choose file
      </Button>
    </div>
  );
};
