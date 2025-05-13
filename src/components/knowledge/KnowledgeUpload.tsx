
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, FileText, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/components/ui/sonner';
import FileUploadTab from './FileUploadTab';
import TextUploadTab from './TextUploadTab';
import { useAuth } from '@/contexts/AuthContext';

interface KnowledgeUploadProps {
  onUploadComplete?: () => void;
}

const KnowledgeUpload = ({ onUploadComplete }: KnowledgeUploadProps) => {
  const [uploadTab, setUploadTab] = useState('file');
  const { user } = useAuth();
  
  const handleUploadSuccess = () => {
    toast.success('Knowledge successfully uploaded');
    if (onUploadComplete) {
      onUploadComplete();
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
          defaultValue="file"
          value={uploadTab}
          onValueChange={setUploadTab}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Add Text
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="mt-4">
            <FileUploadTab onUploadSuccess={handleUploadSuccess} />
          </TabsContent>
          
          <TabsContent value="text" className="mt-4">
            <TextUploadTab onUploadSuccess={handleUploadSuccess} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default KnowledgeUpload;
