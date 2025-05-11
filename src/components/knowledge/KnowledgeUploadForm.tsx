
import React, { useState } from 'react';
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Link as LinkIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useKnowledgeBase, FileUploadProgress } from "@/hooks/useKnowledgeBase";
import { useLoopStore } from '@/store/useLoopStore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

import { FileUploadArea } from "./FileUploadArea";
import { FileUploadPreview } from "./FileUploadPreview";
import { UploadProgress } from "./UploadProgress";
import { AdvancedOptions } from "./AdvancedOptions";

const KnowledgeUploadForm: React.FC = () => {
  const { uploadKnowledge, isUploading, uploadError, uploadProgress } = useKnowledgeBase();
  const { domains, activeDomainId } = useLoopStore();
  
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
      
      if (activeTab === 'text') {
        success = await uploadKnowledge({
          title,
          content,
          domainId: domainId || undefined,
          sourceUrl: sourceUrl || undefined,
          chunkSize,
          overlap,
        });
      } else {
        success = await uploadKnowledge({
          title,
          file: selectedFile!,
          domainId: domainId || undefined,
          sourceUrl: sourceUrl || undefined,
          chunkSize,
          overlap,
          metadata: {
            originalFileName: fileName
          }
        });
      }
      
      if (success) {
        // Reset the form on success
        setTitle('');
        setContent('');
        setSourceUrl('');
        setFileContent(null);
        setFileName(null);
        setSelectedFile(null);
        
        toast.success('Knowledge uploaded successfully!');
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
      
      <div className="space-y-2">
        <Label htmlFor="domain">Domain</Label>
        <Select value={domainId} onValueChange={setDomainId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a domain" />
          </SelectTrigger>
          <SelectContent>
            {/* Fix: Replace empty string value with a non-empty string value */}
            <SelectItem value="no-domain">No specific domain</SelectItem>
            {domains.map((domain) => (
              <SelectItem key={domain.id} value={domain.id}>
                {domain.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="source">Source URL (Optional)</Label>
        <div className="flex items-center space-x-2">
          <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            id="source"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://example.com/document"
          />
        </div>
      </div>
      
      <Tabs defaultValue="text" value={activeTab} onValueChange={(v) => setActiveTab(v as 'text' | 'file')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="text">Text Content</TabsTrigger>
          <TabsTrigger value="file">File Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="text" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type your knowledge content here"
              className="min-h-[200px]"
              required={activeTab === 'text'}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="file" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="file">Upload File</Label>
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
      
      <Button 
        type="submit" 
        disabled={isUploading || (!content && activeTab === 'text') || (!selectedFile && activeTab === 'file')} 
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {activeTab === 'file' ? 'Uploading File...' : 'Uploading...'}
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {activeTab === 'file' ? 'Upload File' : 'Upload Knowledge'}
          </>
        )}
      </Button>
    </form>
  );
};

export default KnowledgeUploadForm;
