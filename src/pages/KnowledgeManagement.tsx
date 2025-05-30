
import React, { useEffect } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import KnowledgeUpload from '@/components/knowledge/KnowledgeUpload';
import KnowledgeLibrary from '@/components/knowledge/KnowledgeLibrary';
import SearchKnowledgeTab from '@/components/knowledge/SearchKnowledgeTab';
import KnowledgeManagementHeader from '@/components/knowledge/KnowledgeManagementHeader';
import UploadProgressTracker from '@/components/knowledge/UploadProgressTracker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, Search, Upload } from "lucide-react";
import { checkStorageBucketsExist } from '@/utils/supabase/storage';

const KnowledgeManagement: React.FC = () => {
  // Check storage buckets exist on component mount (read-only)
  useEffect(() => {
    checkStorageBucketsExist()
      .then(exists => {
        if (exists) {
          console.log('Storage buckets are properly configured');
        }
      })
      .catch(err => console.error('Failed to check storage buckets:', err));
  }, []);
  
  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-8">
        <KnowledgeManagementHeader />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Tabs defaultValue="search" className="space-y-4">
              <TabsList>
                <TabsTrigger value="search">
                  <span className="flex items-center gap-1">
                    <Search className="h-4 w-4" />
                    Search Knowledge
                  </span>
                </TabsTrigger>
                <TabsTrigger value="library">
                  <span className="flex items-center gap-1">
                    <Library className="h-4 w-4" />
                    Knowledge Library
                  </span>
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <span className="flex items-center gap-1">
                    <Upload className="h-4 w-4" />
                    Upload Knowledge
                  </span>
                </TabsTrigger>
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
              
              <TabsContent value="upload">
                <KnowledgeUpload />
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="lg:col-span-1">
            <UploadProgressTracker />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default KnowledgeManagement;
