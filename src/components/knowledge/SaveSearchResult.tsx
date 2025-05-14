
import React, { useState, useEffect } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useLoopStore } from '@/store/useLoopStore';
import { ExternalSource } from '@/types/intelligence';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Loader2, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidUUID } from "@/utils/supabase/helpers";

interface SaveSearchResultProps {
  result: ExternalSource;
  onClose: () => void;
  isOpen: boolean;
  searchQuery: string;
}

const SaveSearchResult: React.FC<SaveSearchResultProps> = ({ 
  result, 
  onClose, 
  isOpen,
  searchQuery
}) => {
  const { uploadKnowledge, isUploading } = useKnowledgeBase();
  const { domains, activeDomainId } = useLoopStore();
  
  // Form state
  const [title, setTitle] = useState(result.title || '');
  const [domainId, setDomainId] = useState(activeDomainId);
  const [notes, setNotes] = useState('');
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Initialize title from result
  useEffect(() => {
    if (result.title) {
      setTitle(result.title);
    }
  }, [result]);
  
  const handleSave = async () => {
    if (!title) {
      toast.error('Title is required');
      return;
    }
    
    setIsProcessing(true);
    setSavingStatus('saving');
    
    try {
      // Process domain ID - convert "no-domain" to undefined to avoid foreign key constraint errors
      // Also validate that domainId is a valid UUID if provided
      const processedDomainId = domainId === "no-domain" ? undefined : 
                              (isValidUUID(domainId) ? domainId : undefined);
      
      // Generate appropriate content based on the result type
      let content = '';
      
      if (result.sourceType === 'node') {
        content = `${result.title}\n\n${result.snippet}\n\nType: ${result.nodeType || 'Knowledge Node'}\nConfidence: ${result.confidence ? (result.confidence * 100).toFixed(0) + '%' : 'Unknown'}`;
      } else {
        content = result.snippet || '';
      }
      
      // Upload the knowledge
      const success = await uploadKnowledge({
        title: title,
        content: content,
        domainId: processedDomainId,
        sourceUrl: result.link,
        metadata: {
          originalSource: result.sourceType === 'node' ? 'knowledge_node' : (result.source || 'web search'),
          searchQuery: searchQuery,
          dateFound: new Date().toISOString(),
          userNotes: notes,
          originalContent: result.snippet || '',
          nodeType: result.nodeType || null,
          nodeConfidence: result.confidence || null
        }
      });
      
      if (success) {
        setSavingStatus('success');
        toast.success('Search result saved to knowledge base');
        // Close after a short delay to show success state
        setTimeout(() => {
          onClose();
          setSavingStatus('idle');
        }, 1500);
      } else {
        setSavingStatus('error');
        toast.error('Failed to save search result');
      }
    } catch (error) {
      console.error('Error saving search result:', error);
      setSavingStatus('error');
      toast.error('Failed to save search result');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Save to Knowledge Base</SheetTitle>
          <SheetDescription>
            Edit and save this search result to your knowledge base
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this knowledge item"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Select
              defaultValue={domainId}
              onValueChange={(value) => setDomainId(value)}
            >
              <SelectTrigger id="domain">
                <SelectValue placeholder="Select a domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-domain">No Domain</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <div className="text-sm bg-muted p-2 rounded-md overflow-hidden text-ellipsis">
              {result.sourceType === 'node' ? 'Knowledge Node' : result.source}
              {result.nodeType && ` - ${result.nodeType.charAt(0).toUpperCase() + result.nodeType.slice(1)}`}
              {result.confidence && ` (Confidence: ${Math.round(result.confidence * 100)}%)`}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Content Preview</Label>
            <div className="text-sm bg-muted p-2 rounded-md h-24 overflow-y-auto">
              {result.snippet}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Add Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or context..."
              className="h-24"
            />
          </div>
          
          <div className="pt-4 space-x-2 flex justify-end">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isProcessing || !title}>
              {savingStatus === 'saving' || isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save to Knowledge
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SaveSearchResult;
