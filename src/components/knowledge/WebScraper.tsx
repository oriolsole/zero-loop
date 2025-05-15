
import React, { useState } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { FileSearch, Search, X, Loader2, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { SourceUrlInput } from './SourceUrlInput';
import { TitleInput } from './TitleInput';
import { toast } from "@/components/ui/sonner";
import { supabase } from '@/integrations/supabase/client';

const WebScraper: React.FC = () => {
  const { uploadKnowledge, isUploading } = useKnowledgeBase();
  
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedContent, setScrapedContent] = useState<string>('');
  const [contentPreview, setContentPreview] = useState<string>('');
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'preview'>('url');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [metadata, setMetadata] = useState<Record<string, string> | null>(null);
  
  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error('Please enter a URL to scrape');
      return;
    }
    
    setIsLoading(true);
    setScrapedContent('');
    setMetadata(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('web-scraper', {
        body: {
          url,
          format: 'markdown',
          includeMetadata
        }
      });
      
      if (error) {
        throw new Error(`Error invoking web scraper: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to scrape website');
      }
      
      setScrapedContent(data.content);
      setContentPreview(data.content.substring(0, 1000) + (data.content.length > 1000 ? '...' : ''));
      setMetadata(data.metadata);
      
      // Set title and source URL based on metadata
      if (data.metadata?.title) setTitle(data.metadata.title);
      setSourceUrl(url);
      
      // Switch to preview tab
      setActiveTab('preview');
      
      toast.success('Website scraped successfully');
    } catch (error) {
      console.error('Error scraping website:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to scrape website');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveToKnowledge = async () => {
    if (!scrapedContent) {
      toast.error('No content to save');
      return;
    }
    
    try {
      await uploadKnowledge({
        title: title || (metadata?.title || 'Scraped content'),
        content: scrapedContent,
        sourceUrl: sourceUrl || url,
        metadata: {
          type: 'scraped',
          tags: ['scraped', 'web-content', metadata?.domain || ''],
          source: 'web-scraper'
        }
      });
      
      toast.success('Content saved to knowledge base');
      
      // Reset form after successful save
      setTitle('');
      setContentPreview('');
      setScrapedContent('');
      setMetadata(null);
      setActiveTab('url');
    } catch (error) {
      console.error('Error saving scraped content:', error);
      toast.error('Failed to save content to knowledge base');
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Web Scraper
          </CardTitle>
          <CardDescription>
            Extract content from websites and save it to your knowledge base
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'url' | 'preview')}>
            <TabsList className="mb-4">
              <TabsTrigger value="url">URL Input</TabsTrigger>
              <TabsTrigger value="preview" disabled={!scrapedContent}>Content Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="url">
              <form onSubmit={handleScrape} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      required
                    />
                    <Button type="submit" disabled={isLoading || !url.trim()}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Scrape
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-metadata"
                    checked={includeMetadata}
                    onCheckedChange={setIncludeMetadata}
                  />
                  <Label htmlFor="include-metadata">Include page metadata</Label>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="preview">
              {metadata && (
                <div className="mb-4 p-4 bg-muted rounded-md">
                  <h3 className="text-lg font-semibold mb-2">Page Metadata</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(metadata).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium">{key}:</span>
                        <span className="truncate">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <TitleInput
                  title={title}
                  setTitle={setTitle}
                />
                
                <SourceUrlInput
                  sourceUrl={sourceUrl}
                  setSourceUrl={setSourceUrl}
                />
                
                <div className="space-y-2">
                  <Label htmlFor="content-preview">Content Preview</Label>
                  <Textarea
                    id="content-preview"
                    value={contentPreview}
                    onChange={(e) => setContentPreview(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    readOnly
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        {scrapedContent && (
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setActiveTab('url');
                setScrapedContent('');
                setMetadata(null);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            <Button 
              onClick={handleSaveToKnowledge} 
              disabled={isUploading || !scrapedContent}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save to Knowledge Base
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default WebScraper;
