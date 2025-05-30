
import React from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import KnowledgeEngines from '@/components/knowledge/KnowledgeEngines';
import WebScraper from '@/components/knowledge/WebScraper';
import MCPsTab from '@/components/knowledge/MCPsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Cog, FileSearch, Terminal } from "lucide-react";

const Tools: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Tools
          </h1>
          <p className="text-muted-foreground">
            Powerful tools for processing, analyzing, and extending your knowledge base
          </p>
        </div>
        
        <Tabs defaultValue="engines" className="space-y-4">
          <TabsList>
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
            <TabsTrigger value="mcps">
              <span className="flex items-center gap-1">
                <Terminal className="h-4 w-4" />
                MCPs
              </span>
            </TabsTrigger>
          </TabsList>
          
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
          
          <TabsContent value="mcps">
            <MCPsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Tools;
