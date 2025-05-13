
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, FileText, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useKnowledgeBase } from '../hooks/useKnowledgeBase';
import { useDomains } from '@/hooks/useDomains';
import { FormFields } from '../components/FormFields';
import { FileUpload } from '../components/FileUpload';
import { UploadProgress } from '../components/UploadProgress';
import { useAuth } from '@/contexts/AuthContext';
import { KnowledgeUploadOptions } from '../types';

const uploadFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  domainId: z.string().optional(),
  sourceUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  chunkSize: z.number().min(100).max(2000).default(1000),
  overlap: z.number().min(0).max(500).default(100),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

export function KnowledgeUploadView() {
  const { uploadKnowledge, isUploading, uploadError, uploadProgress } = useKnowledgeBase();
  const { domains } = useDomains();
  const { user } = useAuth();
  
  const [uploadTab, setUploadTab] = useState<'text' | 'file'>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: '',
      content: '',
      domainId: 'no-domain',
      sourceUrl: '',
      chunkSize: 1000,
      overlap: 100,
    },
  });
  
  const onSubmit = async (values: UploadFormValues) => {
    try {
      let uploadOptions: KnowledgeUploadOptions = {
        title: values.title,
        domainId: values.domainId === 'no-domain' ? undefined : values.domainId,
        sourceUrl: values.sourceUrl || undefined,
        chunkSize: values.chunkSize,
        overlap: values.overlap,
      };
      
      if (uploadTab === 'text') {
        if (!values.content) {
          toast.error('Content is required for text upload');
          return;
        }
        uploadOptions.content = values.content;
      } else {
        if (!selectedFile) {
          toast.error('File is required for file upload');
          return;
        }
        uploadOptions.file = selectedFile;
        uploadOptions.metadata = {
          originalFileName: selectedFile.name
        };
      }
      
      const success = await uploadKnowledge(uploadOptions);
      
      if (success) {
        // Reset form
        form.reset();
        setSelectedFile(null);
        toast.success('Knowledge uploaded successfully');
      }
    } catch (error) {
      console.error('Error during upload:', error);
      toast.error('Failed to upload knowledge');
    }
  };
  
  return (
    <Card className="w-full">
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
        
        <Tabs
          defaultValue="text"
          value={uploadTab}
          onValueChange={(value) => setUploadTab(value as 'text' | 'file')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Add Text
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Upload File
            </TabsTrigger>
          </TabsList>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            {uploadError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Upload Failed</AlertTitle>
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
            
            <FormFields 
              form={form}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              domains={domains}
            />
            
            <TabsContent value="text" className="space-y-4 pt-4">
              <Controller
                name="content"
                control={form.control}
                render={({ field }) => (
                  <textarea
                    className="w-full min-h-[200px] p-2 border rounded-md"
                    placeholder="Enter your knowledge content here..."
                    {...field}
                  />
                )}
              />
            </TabsContent>
            
            <TabsContent value="file" className="space-y-4 pt-4">
              <FileUpload
                selectedFile={selectedFile}
                setSelectedFile={(file) => {
                  setSelectedFile(file);
                  // Auto-fill title if empty
                  if (!form.getValues('title') && file?.name) {
                    const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
                    form.setValue('title', nameWithoutExtension);
                  }
                }}
              />
            </TabsContent>
            
            {uploadProgress && <UploadProgress progress={uploadProgress} />}
            
            <Button 
              type="submit"
              disabled={isUploading || (uploadTab === 'file' && !selectedFile)}
              className="w-full"
            >
              {isUploading ? 'Uploading...' : 'Upload Knowledge'}
            </Button>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}
