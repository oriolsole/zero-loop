
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Library, FileUp } from "lucide-react";
import { KnowledgeSearchView } from "./views/KnowledgeSearchView";
import { KnowledgeLibraryView } from "./views/KnowledgeLibraryView";
import { KnowledgeUploadView } from "./views/KnowledgeUploadView";

export function KnowledgeLayout() {
  const [activeTab, setActiveTab] = useState<string>('search');
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Management</h1>
        <p className="text-muted-foreground">
          Upload, search, and manage your knowledge base
        </p>
      </div>
      
      <Tabs 
        defaultValue="search" 
        className="space-y-4"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Knowledge
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            Knowledge Library
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Upload Knowledge
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="space-y-6">
          <KnowledgeSearchView />
        </TabsContent>
        
        <TabsContent value="library">
          <KnowledgeLibraryView />
        </TabsContent>
        
        <TabsContent value="upload">
          <KnowledgeUploadView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
