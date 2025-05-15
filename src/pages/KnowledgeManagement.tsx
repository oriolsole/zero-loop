
import React, { useEffect } from 'react';
import KnowledgeUpload from '@/components/knowledge/KnowledgeUpload';
import KnowledgeLibrary from '@/components/knowledge/KnowledgeLibrary';
import KnowledgeEngines from '@/components/knowledge/KnowledgeEngines';
import SearchKnowledgeTab from '@/components/knowledge/SearchKnowledgeTab';
import WebScraper from '@/components/knowledge/WebScraper';
import KnowledgeManagementHeader from '@/components/knowledge/KnowledgeManagementHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, Cog, Brain, FileSearch } from "lucide-react";
import { ensureStorageBucketsExist } from '@/utils/supabase/storage';

const KnowledgeManagement: React.FC = () => {
  // Ensure storage buckets exist on component mount
  useEffect(() => {
    ensureStorageBucketsExist()
      .catch(err => console.error('Failed to initialize storage buckets:', err));
  }, []);
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <KnowledgeManagementHeader />
      
      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Search Knowledge</TabsTrigger>
          <TabsTrigger value="library">
            <span className="flex items-center gap-1">
              <Library className="h-4 w-4" />
              Knowledge Library
            </span>
          </TabsTrigger>
          <TabsTrigger value="engines">
            <span className="flex items-center gap-1">
              <Cog className="h-4 w-4" />
              Knowledge Engines
            </span>
          </TabsTrigger>
          <TabsTrigger value="scraper">
            <span className="flex items-center gap-1">
              <FileSearch className="h-4 w-4" />
              Web Scraper
            </span>
          </TabsTrigger>
          <TabsTrigger value="upload">Upload Knowledge</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search">
          <SearchKnowledgeTab />
        </TabsContent>
        
        <TabsContent value="library">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="h-5 w-5" />
                Knowledge Library
              </CardTitle>
              <CardDescription>
                Browse and manage all your uploaded knowledge items
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <KnowledgeLibrary />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="engines">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" />
                Knowledge Engines
              </CardTitle>
              <CardDescription>
                Explore the available knowledge engines and their capabilities
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <KnowledgeEngines />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scraper">
          <WebScraper />
        </TabsContent>
        
        <TabsContent value="upload">
          <KnowledgeUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeManagement;
