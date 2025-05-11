
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { Loader2, Upload, FileText, Link as LinkIcon } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLoopStore } from '@/store/useLoopStore';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const KnowledgeUpload: React.FC = () => {
  const { uploadKnowledge, isUploading, uploadError } = useKnowledgeBase();
  const { domains, activeDomainId } = useLoopStore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [domainId, setDomainId] = useState(activeDomainId);
  const [sourceUrl, setSourceUrl] = useState('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [chunkSize, setChunkSize] = useState(1000);
  const [overlap, setOverlap] = useState(100);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target?.result as string;
      setFileContent(fileContent);
      
      // Auto-fill title if empty
      if (!title && file.name) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExtension);
      }
      
      // Auto-fill content area
      setContent(fileContent);
    };
    
    reader.readAsText(file);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content) {
      toast.error('Title and content are required');
      return;
    }
    
    try {
      const success = await uploadKnowledge({
        title,
        content,
        domainId: domainId || undefined,
        sourceUrl: sourceUrl || undefined,
        chunkSize,
        overlap,
      });
      
      if (success) {
        // Reset the form on success
        setTitle('');
        setContent('');
        setSourceUrl('');
        setFileContent(null);
        setFileName(null);
        
        toast.success('Knowledge uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading knowledge:', error);
      toast.error('Failed to upload knowledge');
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload Knowledge
        </CardTitle>
        <CardDescription>
          Add documents or text content to your knowledge base
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
            <Label htmlFor="file">Upload File (Optional)</Label>
            <Input 
              id="file" 
              type="file" 
              accept=".txt,.md,.csv,.json,.html"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {fileName && (
              <p className="text-xs text-muted-foreground mt-1">
                Loaded: {fileName}
              </p>
            )}
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
          
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type your knowledge content here"
              className="min-h-[200px]"
              required
            />
          </div>
          
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
          
          <Button type="submit" disabled={isUploading || !title || !content} className="w-full">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Knowledge
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default KnowledgeUpload;
