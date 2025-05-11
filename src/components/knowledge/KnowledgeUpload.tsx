
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import KnowledgeUploadForm from "./KnowledgeUploadForm";

const KnowledgeUpload: React.FC = () => {
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
        <KnowledgeUploadForm />
      </CardContent>
    </Card>
  );
};

export default KnowledgeUpload;
