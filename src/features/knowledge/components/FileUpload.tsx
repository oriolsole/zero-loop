
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUp, File, Image as ImageIcon } from "lucide-react";

interface FileUploadProps {
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
}

export function FileUpload({ selectedFile, setSelectedFile }: FileUploadProps) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    
    // If it's a text-based file, show preview
    if (file.type.includes('text') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFileContent(content);
      };
      reader.readAsText(file);
    } else {
      setFileContent(null);
    }
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
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center">
        {renderFileIcon()}
        
        <div className="mt-4 mb-3">
          <p className="text-sm font-medium">
            {selectedFile?.name || 'Drag and drop file or click to upload'}
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
      
      {fileContent && (
        <div>
          <p className="text-sm font-medium mb-1">File Preview</p>
          <div className="border rounded-md p-4 bg-muted/30 max-h-[200px] overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap">{fileContent}</pre>
          </div>
        </div>
      )}
      
      {selectedFile && selectedFile.type.includes('image') && (
        <div>
          <p className="text-sm font-medium mb-1">Image Preview</p>
          <div className="border rounded-md p-4 bg-muted/30 flex justify-center">
            <img 
              src={URL.createObjectURL(selectedFile)} 
              alt="Preview" 
              className="max-h-[200px] object-contain" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
