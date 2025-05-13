
import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { DomainSelector } from './DomainSelector';
import { SourceUrlInput } from './SourceUrlInput';
import { AdvancedOptions } from './AdvancedOptions';
import { UploadProgress } from './UploadProgress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowRight, Settings } from 'lucide-react';
import { useLoopStore } from '@/store/useLoopStore';
import { toast } from '@/components/ui/sonner';

interface TextUploadTabProps {
  onUploadSuccess?: () => void;
  content?: string;
  setContent?: React.Dispatch<React.SetStateAction<string>>;
}

const TextUploadTab: React.FC<TextUploadTabProps> = ({ 
  onUploadSuccess,
  content: externalContent,
  setContent: setExternalContent 
}) => {
  const { uploadKnowledge, isUploading, uploadError, uploadProgress } = useKnowledgeBase();
  const { domains, activeDomainId } = useLoopStore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(externalContent || '');
  const [domainId, setDomainId] = useState(activeDomainId);
  const [sourceUrl, setSourceUrl] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [chunkSize, setChunkSize] = useState(1000);
  const [overlap, setOverlap] = useState(100);
  
  // Update local content when external content changes
  React.useEffect(() => {
    if (externalContent !== undefined) {
      setContent(externalContent);
    }
  }, [externalContent]);

  // Update external content when local content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (setExternalContent) {
      setExternalContent(newContent);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      toast.error('Title is required');
      return;
    }
    
    if (!content) {
      toast.error('Content is required');
      return;
    }
    
    try {
      // Process domain ID - convert "no-domain" to undefined
      const processedDomainId = domainId === "no-domain" ? undefined : domainId;
      
      const success = await uploadKnowledge({
        title,
        content,
        domainId: processedDomainId,
        sourceUrl: sourceUrl || undefined,
        chunkSize,
        overlap
      });
      
      if (success) {
        // Reset the form on success
        setTitle('');
        setContent('');
        setSourceUrl('');
        
        toast.success('Knowledge text uploaded successfully!');
        
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        
        // Update external content state if provided
        if (setExternalContent) {
          setExternalContent('');
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
      
      <DomainSelector domainId={domainId} setDomainId={setDomainId} domains={domains} />
      <SourceUrlInput sourceUrl={sourceUrl} setSourceUrl={setSourceUrl} />
      
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={handleContentChange}
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
        disabled={isUploading || !content || !title}
        className="w-full flex items-center gap-2"
      >
        {isUploading ? (
          <>Processing Upload...</>
        ) : (
          <>
            Upload Content <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
};

export default TextUploadTab;
