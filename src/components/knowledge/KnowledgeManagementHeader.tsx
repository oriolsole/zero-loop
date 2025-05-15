
import React from 'react';
import { BookOpen } from "lucide-react";

const KnowledgeManagementHeader: React.FC = () => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Management</h1>
      </div>
      <p className="text-muted-foreground">
        Upload, search, and manage your knowledge base
      </p>
    </div>
  );
};

export default KnowledgeManagementHeader;
