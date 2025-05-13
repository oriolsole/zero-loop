
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchIcon, Library, Upload } from 'lucide-react';
import KnowledgeSearchView from './views/KnowledgeSearchView';
import KnowledgeLibraryView from './views/KnowledgeLibraryView';
import KnowledgeUploadView from './views/KnowledgeUploadView';

export type KnowledgeTab = 'search' | 'library' | 'upload';

interface KnowledgeLayoutProps {
  defaultTab?: KnowledgeTab;
}

export default function KnowledgeLayout({ defaultTab = 'search' }: KnowledgeLayoutProps) {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>(defaultTab);
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as KnowledgeTab);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Management</h1>
        <p className="text-muted-foreground">
          Search, manage, and upload knowledge to enhance the intelligence engine
        </p>
      </div>
      
      <Tabs 
        defaultValue={defaultTab} 
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 md:w-auto">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <SearchIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="space-y-6">
          <KnowledgeSearchView />
        </TabsContent>
        
        <TabsContent value="library" className="space-y-6">
          <KnowledgeLibraryView />
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-6">
          <KnowledgeUploadView onUploadComplete={() => setActiveTab('library')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
