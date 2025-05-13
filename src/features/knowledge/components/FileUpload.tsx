
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUp, File, Image as ImageIcon } from "lucide-react";

interface FileUploadProps {
  onFileChange: (file: File) => void;
  accept?: string;
  error?: string;
}

export function FileUpload({ onFileChange, accept = ".pdf,.jpg,.jpeg,.png,.gif,.txt,.md,.csv", error }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setFileName(file.name);
    onFileChange(file);
  };
  
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
    <div className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center ${error ? "border-destructive" : ""}`}>
      {renderFileIcon()}
      
      <div className="mt-4 mb-3">
        <p className={`text-sm font-medium ${error ? "text-destructive" : ""}`}>
          {fileName || 'Drag and drop file or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports PDF, images, text files, Markdown, and CSV
        </p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      
      <Input 
        id="file" 
        type="file" 
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
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
}

interface FilePreviewProps {
  file: File | null;
  content: string | null;
}

export function FilePreview({ file, content }: FilePreviewProps) {
  if (!file) return null;
  
  return (
    <div className="space-y-4">
      {content && (
        <div>
          <label className="block text-sm font-medium text-gray-700">File Preview</label>
          <div className="border rounded-md p-4 bg-muted/30 mt-1 max-h-[200px] overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap">{content}</pre>
          </div>
        </div>
      )}
      
      {file && file.type.includes('image') && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Image Preview</label>
          <div className="border rounded-md p-4 bg-muted/30 mt-1 flex justify-center">
            <img 
              src={URL.createObjectURL(file)} 
              alt="Preview" 
              className="max-h-[200px] object-contain" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
