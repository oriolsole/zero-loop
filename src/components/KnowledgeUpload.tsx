
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useKnowledgeBase, FileUploadProgress } from "@/hooks/useKnowledgeBase";
import { Loader2, Upload, FileText, Link as LinkIcon, Image as ImageIcon, FileUp, FilePdf } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLoopStore } from '@/store/useLoopStore';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const KnowledgeUpload: React.FC = () => {
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

  // Helper to render file icon based on type
  const renderFileIcon = () => {
    if (!selectedFile) return <FileUp className="h-10 w-10" />;
    
    if (selectedFile.type.includes('pdf')) {
      return <FilePdf className="h-10 w-10 text-red-500" />;
    } else if (selectedFile.type.includes('image')) {
      return <ImageIcon className="h-10 w-10 text-blue-500" />;
    } else {
      return <FileText className="h-10 w-10 text-gray-500" />;
    }
  };
  
  // Render upload progress indicator
  const renderProgress = (progress: FileUploadProgress) => {
    return (
      <div className="space-y-2 mt-4">
        <div className="flex justify-between text-xs">
          <span>{progress.status}</span>
          <span>{Math.round(progress.progress)}%</span>
        </div>
        <Progress value={progress.progress} className="h-2" />
        {progress.message && (
          <p className="text-xs text-muted-foreground">{progress.message}</p>
        )}
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload Knowledge
        </CardTitle>
        <CardDescription>
          Add documents, images, PDFs, or text content to your knowledge base
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {uploadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
                <SelectItem value="">No specific domain</SelectItem>
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
                
                {fileContent && (
                  <div className="mt-4">
                    <Label>File Preview</Label>
                    <div className="border rounded-md p-4 bg-muted/30 mt-1 max-h-[200px] overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap">{fileContent}</pre>
                    </div>
                  </div>
                )}
                
                {selectedFile && selectedFile.type.includes('image') && (
                  <div className="mt-4">
                    <Label>Image Preview</Label>
                    <div className="border rounded-md p-4 bg-muted/30 mt-1 flex justify-center">
                      <img 
                        src={URL.createObjectURL(selectedFile)} 
                        alt="Preview" 
                        className="max-h-[200px] object-contain" 
                      />
                    </div>
                  </div>
                )}
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
            <div className="space-y-4 border rounded-md p-4">
              <div className="space-y-2">
                <Label htmlFor="chunkSize">Chunk Size</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="chunkSize"
                    type="number"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    min={100}
                    max={10000}
                  />
                  <span className="text-sm text-muted-foreground">characters</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum size of each text chunk (default: 1000)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="overlap">Chunk Overlap</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="overlap"
                    type="number"
                    value={overlap}
                    onChange={(e) => setOverlap(Number(e.target.value))}
                    min={0}
                    max={500}
                  />
                  <span className="text-sm text-muted-foreground">characters</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Overlap between consecutive chunks (default: 100)
                </p>
              </div>
            </div>
          )}
          
          {uploadProgress && renderProgress(uploadProgress)}
          
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
      </CardContent>
    </Card>
  );
};

export default KnowledgeUpload;
