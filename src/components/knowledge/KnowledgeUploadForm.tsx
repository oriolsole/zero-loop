import React, { useState } from 'react';
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useLoopStore } from '@/store/useLoopStore';
import { useUploadProgress } from '@/hooks/knowledge/useUploadProgress';
import { AlertCircle } from 'lucide-react';

import { TitleInput } from "./TitleInput";
import { DomainSelector } from "./DomainSelector";
import { SourceUrlInput } from "./SourceUrlInput";
import { TextUploadTab } from "./TextUploadTab";
import { FileUploadArea } from "./FileUploadArea";
import { FileUploadPreview } from "./FileUploadPreview";
import { UploadProgress } from "./UploadProgress";
import { AdvancedOptions } from "./AdvancedOptions";
import { SubmitButton } from "./SubmitButton";
import FileThumbnail from "./FileThumbnail";
import { isValidUUID } from "@/utils/supabase/helpers";

const KnowledgeUploadForm: React.FC = () => {
  const { uploadKnowledge, isUploading, uploadError, uploadProgress } = useKnowledgeBase();
  const { domains, activeDomainId } = useLoopStore();
  const { startPolling } = useUploadProgress();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [domainId, setDomainId] = useState(activeDomainId);
  const [sourceUrl, setSourceUrl] = useState('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [chunkSize, setChunkSize] = useState(1000);
  const [overlap, setOverlap] = useState(100);
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  
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
    
    if (activeTab === 'text' && !content) {
      toast.error('Content is required for text upload');
      return;
    }
    
    if (activeTab === 'file' && !selectedFile) {
      toast.error('File is required for file upload');
      return;
    }
    
    try {
      let success;
      let uploadId: string | undefined;
      
      // Process domain ID - convert "no-domain" to undefined to avoid foreign key constraint errors
      // Also validate that domainId is a valid UUID if provided
      const processedDomainId = domainId === "no-domain" ? undefined : 
                               (isValidUUID(domainId) ? domainId : undefined);
      
      if (activeTab === 'text') {
        const result = await uploadKnowledge({
          title,
          content,
          domainId: processedDomainId,
          sourceUrl: sourceUrl || undefined,
          chunkSize,
          overlap,
        });
        
        // Handle background processing response
        if (typeof result === 'object' && result.backgroundProcessing) {
          uploadId = result.uploadId;
          success = true;
        } else {
          success = result as boolean;
        }
      } else {
        const result = await uploadKnowledge({
          title,
          file: selectedFile!,
          domainId: processedDomainId,
          sourceUrl: sourceUrl || undefined,
          chunkSize,
          overlap,
          metadata: {
            originalFileName: fileName
          }
        });
        
        // Handle background processing response
        if (typeof result === 'object' && result.backgroundProcessing) {
          uploadId = result.uploadId;
          success = true;
        } else {
          success = result as boolean;
        }
      }
      
      if (success) {
        // If we got an upload ID, start polling for progress
        if (uploadId) {
          startPolling(uploadId, title);
          toast.success('Upload started in background. You can monitor progress below.');
        } else {
          toast.success('Knowledge uploaded successfully!');
        }
        
        // Reset the form on success
        setTitle('');
        setContent('');
        setSourceUrl('');
        setFileContent(null);
        setFileName(null);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Error uploading knowledge:', error);
      toast.error('Failed to upload knowledge');
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {uploadError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      
      <TitleInput title={title} setTitle={setTitle} />
      <DomainSelector domainId={domainId} setDomainId={setDomainId} domains={domains} />
      <SourceUrlInput sourceUrl={sourceUrl} setSourceUrl={setSourceUrl} />
      
      <Tabs defaultValue="text" value={activeTab} onValueChange={(v) => setActiveTab(v as 'text' | 'file')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text">Text Content</TabsTrigger>
          <TabsTrigger value="file">File Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="text" className="space-y-4 pt-4">
          <TextUploadTab content={content} setContent={setContent} />
        </TabsContent>
        
        <TabsContent value="file" className="space-y-4 pt-4">
          <div className="space-y-2">
            <FileUploadArea 
              selectedFile={selectedFile} 
              fileName={fileName}
              handleFileChange={handleFileChange}
            />
            
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
                <FileThumbnail file={selectedFile} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
            
            <FileUploadPreview
              selectedFile={selectedFile}
              fileContent={fileContent}
              fileName={fileName}
            />
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex items-center space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => setAdvanced(!advanced)}
        >
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
      
      <SubmitButton 
        isUploading={isUploading} 
        isDisabled={(activeTab === 'text' && !content) || (activeTab === 'file' && !selectedFile)}
        isFileUpload={activeTab === 'file'} 
      />
    </form>
  );
};

export default KnowledgeUploadForm;
