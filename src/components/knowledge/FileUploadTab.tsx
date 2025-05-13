
import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { FileUploadArea } from './FileUploadArea';
import { FileUploadPreview } from './FileUploadPreview';
import { AdvancedOptions } from './AdvancedOptions';
import { UploadProgress } from './UploadProgress';
import { DomainSelector } from './DomainSelector';
import { SourceUrlInput } from './SourceUrlInput';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowRight, Settings } from 'lucide-react';
import { useLoopStore } from '@/store/useLoopStore';
import { toast } from '@/components/ui/sonner';
import { ensureSafeDomainId } from '@/utils/domainUtils';
import { isValidUUID } from '@/utils/supabase/helpers';

interface FileUploadTabProps {
  onUploadSuccess?: () => void;
}

const FileUploadTab: React.FC<FileUploadTabProps> = ({ onUploadSuccess }) => {
  const { uploadKnowledge, isUploading, uploadError, uploadProgress } = useKnowledgeBase();
  const { domains, activeDomainId } = useLoopStore();
  
  // Ensure we start with a valid domainId (never empty string)
  const [domainId, setDomainId] = useState(ensureSafeDomainId(activeDomainId));
  
  // Update domainId if activeDomainId changes (and it's a valid ID)
  useEffect(() => {
    if (activeDomainId) {
      setDomainId(ensureSafeDomainId(activeDomainId));
    }
  }, [activeDomainId]);
  
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [chunkSize, setChunkSize] = useState(1000);
  const [overlap, setOverlap] = useState(100);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setSelectedFile(file);
    
    // Auto-fill title if empty
    if (!title && file.name) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExtension);
    }
    
    // If it's a text-based file, show preview
    if (file.type.includes('text') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result as string;
        setFileContent(fileContent);
      };
      reader.readAsText(file);
    } else {
      setFileContent(null);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      toast.error('Title is required');
      return;
    }
    
    if (!selectedFile) {
      toast.error('File is required');
      return;
    }
    
    try {
      // Process domain ID - convert "no-domain" to undefined
      // For any other value, ensure it's a valid UUID or set to undefined
      let processedDomainId: string | undefined = undefined;
      
      if (domainId !== "no-domain") {
        // Only use the domain ID if it's a valid UUID
        processedDomainId = isValidUUID(domainId) ? domainId : undefined;
      }
      
      const success = await uploadKnowledge({
        title,
        file: selectedFile,
        domainId: processedDomainId,
        sourceUrl: sourceUrl || undefined,
        chunkSize,
        overlap,
        metadata: {
          originalFileName: fileName
        }
      });
      
      if (success) {
        // Reset the form on success
        setTitle('');
        setSourceUrl('');
        setFileContent(null);
        setFileName(null);
        setSelectedFile(null);
        
        toast.success('Knowledge file uploaded successfully!');
        
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }
    } catch (error) {
      console.error('Error uploading knowledge:', error);
      toast.error('Failed to upload knowledge');
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
          required
        />
      </div>
      
      <DomainSelector 
        domainId={domainId} 
        setDomainId={(id) => setDomainId(ensureSafeDomainId(id))} 
        domains={domains} 
      />
      
      <SourceUrlInput sourceUrl={sourceUrl} setSourceUrl={setSourceUrl} />
      
      <div className="space-y-2">
        <FileUploadArea 
          selectedFile={selectedFile} 
          fileName={fileName}
          handleFileChange={handleFileChange}
        />
        
        <FileUploadPreview
          selectedFile={selectedFile}
          fileContent={fileContent}
          fileName={fileName}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => setAdvanced(!advanced)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          {advanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
        </Button>
      </div>
      
      {advanced && (
        <AdvancedOptions 
          chunkSize={chunkSize}
          overlap={overlap}
          setChunkSize={setChunkSize}
          setOverlap={setOverlap}
        />
      )}
      
      {uploadProgress && <UploadProgress progress={uploadProgress} />}
      
      <Button 
        type="submit" 
        disabled={isUploading || !selectedFile || !title}
        className="w-full flex items-center gap-2"
      >
        {isUploading ? (
          <>Processing Upload...</>
        ) : (
          <>
            Upload File <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
};

export default FileUploadTab;
