
import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, FileUp, AlertTriangle, Loader2, ArrowRight, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';
import { useLoopStore } from '@/store/useLoopStore';
import { useAuth } from '@/contexts/AuthContext';
import { DomainField, SourceUrlField, ContentField } from '../components/FormFields';
import { FileUpload, FilePreview } from '../components/FileUpload';
import { UploadProgress } from '../components/UploadProgress';
import { processDomainId } from '../lib/domainUtils';

interface KnowledgeUploadViewProps {
  onUploadComplete?: () => void;
}

// Create zod schema for upload form
const uploadFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  domainId: z.string().optional(),
  sourceUrl: z.string().optional(),
  content: z.string().optional(),
  chunkSize: z.number().min(100).max(10000).default(1000),
  overlap: z.number().min(0).max(500).default(100),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export default function KnowledgeUploadView({ onUploadComplete }: KnowledgeUploadViewProps) {
  const { uploadKnowledge, isUploading, uploadError, uploadProgress } = useKnowledgeBase();
  const { domains, activeDomainId } = useLoopStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const [uploadTab, setUploadTab] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Initialize form with default values
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: '',
      domainId: activeDomainId || 'no-domain',
      sourceUrl: '',
      content: '',
      chunkSize: 1000,
      overlap: 100
    }
  });
  
  // Handle file selection
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    
    // Auto-fill title if empty
    const title = form.getValues('title');
    if (!title && file.name) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      form.setValue('title', nameWithoutExtension);
    }
    
    // Preview text-based files
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
  
  // Handle form submission
  const onSubmit = async (values: UploadFormValues) => {
    try {
      if (uploadTab === 'text' && !values.content) {
        toast({ 
          title: "Validation error", 
          description: "Content is required for text upload",
          variant: "destructive"
        });
        return;
      }
      
      if (uploadTab === 'file' && !selectedFile) {
        toast({ 
          title: "Validation error", 
          description: "File is required for file upload",
          variant: "destructive"
        });
        return;
      }
      
      // Process domain ID for API
      const processedDomainId = processDomainId(values.domainId);
      
      // Upload based on the active tab
      const uploadOptions = {
        title: values.title,
        domainId: processedDomainId,
        sourceUrl: values.sourceUrl || undefined,
        chunkSize: values.chunkSize,
        overlap: values.overlap,
      };
      
      if (uploadTab === 'text') {
        // Text upload
        const success = await uploadKnowledge({
          ...uploadOptions,
          content: values.content
        });
        
        if (success) handleSuccess();
      } else {
        // File upload
        const success = await uploadKnowledge({
          ...uploadOptions,
          file: selectedFile!,
          metadata: {
            originalFileName: selectedFile?.name
          }
        });
        
        if (success) handleSuccess();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({ 
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Handle successful upload
  const handleSuccess = () => {
    // Reset form state
    form.reset();
    setSelectedFile(null);
    setFileContent(null);
    
    // Show toast and call completion handler
    toast({ title: "Success", description: "Knowledge uploaded successfully" });
    if (onUploadComplete) onUploadComplete();
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-5 w-5" />
          Upload Knowledge
        </CardTitle>
        <CardDescription>
          Add new knowledge files or text to your knowledge base
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!user && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              You need to be signed in to upload knowledge. Please log in to continue.
            </AlertDescription>
          </Alert>
        )}
        
        {uploadError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Common fields for both tabs */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Document title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="domainId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        <option value="no-domain">No specific domain</option>
                        {domains.map(domain => (
                          <option key={domain.id} value={domain.id}>
                            {domain.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sourceUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source URL (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/document" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Tabs
              defaultValue="file"
              value={uploadTab}
              onValueChange={(value) => setUploadTab(value as 'file' | 'text')}
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <FileUp className="h-4 w-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Add Text
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="file" className="space-y-4">
                <FileUpload
                  onFileChange={handleFileSelected}
                  error={selectedFile ? undefined : form.formState.isSubmitted ? "File is required" : undefined}
                />
                
                <FilePreview
                  file={selectedFile}
                  content={fileContent}
                />
              </TabsContent>
              
              <TabsContent value="text" className="space-y-4">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Paste or type your knowledge content here"
                          className="min-h-[200px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            
            <div className="flex items-center space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
              </Button>
            </div>
            
            {showAdvanced && (
              <div className="space-y-4 border rounded-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="chunkSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chunk Size</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              min={100}
                              max={10000}
                            />
                            <span className="text-sm text-muted-foreground">characters</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximum size of each text chunk
                        </p>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="overlap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chunk Overlap</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              min={0}
                              max={500}
                            />
                            <span className="text-sm text-muted-foreground">characters</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          Overlap between consecutive chunks
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
            
            {uploadProgress && <UploadProgress progress={uploadProgress} />}
            
            <Button 
              type="submit" 
              disabled={isUploading || (uploadTab === 'file' && !selectedFile) || form.formState.isSubmitting}
              className="w-full flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Upload...
                </>
              ) : (
                <>
                  {uploadTab === 'file' ? (
                    <>Upload File <ArrowRight className="h-4 w-4" /></>
                  ) : (
                    <>Upload Content <ArrowRight className="h-4 w-4" /></>
                  )}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
