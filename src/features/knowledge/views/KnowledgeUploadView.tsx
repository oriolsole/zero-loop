
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload, Upload, FileText, Clipboard } from 'lucide-react';
import { DomainSelector } from '@/components/knowledge/DomainSelector';
import { toast } from '@/components/ui/sonner';
import { UploadProgress } from '@/features/knowledge/components/UploadProgress';
import { useKnowledgeBase } from '@/hooks/knowledge/useKnowledgeBase';
import { useDomains } from '@/hooks/useDomains';

interface KnowledgeUploadViewProps {
  onUploadComplete?: () => void;
}

export default function KnowledgeUploadView({ onUploadComplete }: KnowledgeUploadViewProps) {
  // State for the form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [domainId, setDomainId] = useState('no-domain');
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<string>('text');
  
  // Get domains
  const { domains, isLoading: isLoadingDomains } = useDomains();
  
  // Knowledge base hook
  const { uploadKnowledge, isUploading, uploadError, uploadProgress } = useKnowledgeBase();
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      toast.error('Please enter a title');
      return;
    }
    
    if (activeTab === 'text' && !content) {
      toast.error('Please enter some content');
      return;
    }
    
    if (activeTab === 'file' && !file) {
      toast.error('Please select a file to upload');
      return;
    }
    
    try {
      const result = await uploadKnowledge({
        title,
        content: activeTab === 'text' ? content : undefined,
        file: activeTab === 'file' ? file : undefined,
        sourceUrl: sourceUrl || undefined,
        domainId: domainId !== 'no-domain' ? domainId : undefined,
      });
      
      if (result) {
        // Reset the form
        setTitle('');
        setContent('');
        setSourceUrl('');
        setFile(null);
        
        toast.success('Knowledge uploaded successfully');
        
        // Call onUploadComplete callback if provided
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
    } catch (error) {
      console.error('Error uploading knowledge:', error);
      toast.error('Failed to upload knowledge');
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  // Handle removing selected file
  const handleRemoveFile = () => {
    setFile(null);
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Input
                id="title"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-medium"
                required
              />
            </div>
            
            <div>
              <Input
                id="source-url"
                placeholder="Source URL (optional)"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>
            
            <DomainSelector
              domainId={domainId}
              setDomainId={setDomainId}
              domains={domains}
            />
          </div>
          
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Text Content
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <FileUpload className="h-4 w-4" />
                Upload File
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4">
              <Textarea
                placeholder="Enter knowledge content..."
                className="min-h-[200px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setContent(text);
                      toast.success('Content pasted from clipboard');
                    } catch (error) {
                      console.error('Failed to read clipboard:', error);
                      toast.error('Failed to paste from clipboard');
                    }
                  }}
                >
                  <Clipboard className="h-3 w-3" />
                  Paste from clipboard
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="file" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {!file ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Upload className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Drag and drop or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported files: PDF, TXT, Images, Word documents
                      </p>
                    </div>
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.txt,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Select File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {file.type || 'Unknown file type'} • {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      Remove File
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          {uploadProgress && (
            <div className="py-4">
              <UploadProgress progress={uploadProgress} />
            </div>
          )}
          
          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isUploading || (activeTab === 'text' && !content) || (activeTab === 'file' && !file)}
            >
              {isUploading ? 'Uploading...' : 'Upload Knowledge'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
