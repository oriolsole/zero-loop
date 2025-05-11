
import React, { useState, useEffect } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import KnowledgeUpload from '@/components/KnowledgeUpload';
import ExternalSources from '@/components/ExternalSources';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Database, Info } from "lucide-react";

const KnowledgeManagement: React.FC = () => {
  const { 
    queryKnowledgeBase, 
    isQuerying, 
    queryError, 
    recentResults 
  } = useKnowledgeBase();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    await queryKnowledgeBase({
      query: searchQuery,
      limit: 10
    });
    
    setHasSearched(true);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Management</h1>
        <p className="text-muted-foreground">
          Upload, search, and manage your knowledge base
        </p>
      </div>
      
      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Search Knowledge</TabsTrigger>
          <TabsTrigger value="upload">Upload Knowledge</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Knowledge Base
              </CardTitle>
              <CardDescription>
                Search your existing knowledge to see what's already stored
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Query</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter search terms"
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isQuerying || !searchQuery.trim()}>
                      {isQuerying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      <span className="ml-2">Search</span>
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
          
          {hasSearched && (
            <div className="space-y-4">
              {queryError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                  <p className="text-red-700">{queryError}</p>
                </div>
              )}
              
              {!queryError && recentResults.length === 0 ? (
                <div className="bg-muted p-8 rounded-md text-center">
                  <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-1">No results found</h3>
                  <p className="text-muted-foreground">
                    Try different search terms or upload knowledge first
                  </p>
                </div>
              ) : (
                <ExternalSources 
                  sources={recentResults}
                  title="Knowledge Base Results"
                  description={`Found ${recentResults.length} results for "${searchQuery}"`}
                />
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="upload">
          <KnowledgeUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeManagement;
