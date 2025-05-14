
import React from 'react';
import KnowledgeUpload from '@/components/knowledge/KnowledgeUpload';
import { toast } from '@/components/ui/sonner';

export function KnowledgeUploadView() {
  return (
    <KnowledgeUpload 
      onUploadComplete={() => {
        toast.success('Knowledge upload complete');
        // We don't need to manually switch tabs here since the KnowledgeLayout component handles tab state
      }}
    />
  );
}
