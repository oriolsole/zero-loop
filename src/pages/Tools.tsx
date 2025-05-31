
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import KnowledgeEngines from '@/components/knowledge/KnowledgeEngines';
import WebScraper from '@/components/knowledge/WebScraper';
import MCPsTab from '@/components/knowledge/MCPsTab';
import GoogleAPIConnection from '@/components/knowledge/GoogleAPIConnection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Cog, FileSearch, Terminal, HardDrive } from "lucide-react";
import { toast } from '@/components/ui/sonner';

const Tools: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'google_connected') {
      toast.success('Google APIs connected successfully!');
      // Clean up URL parameters
      searchParams.delete('success');
      setSearchParams(searchParams, { replace: true });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'no_code': 'No authorization code received from Google',
        'config_error': 'Google OAuth configuration error',
        'token_exchange_failed': 'Failed to exchange authorization code for tokens',
        'user_not_found': 'User authentication required',
        'storage_failed': 'Failed to store Google API tokens',
        'processing_failed': 'Error processing Google OAuth response'
      };
      
      const errorMessage = errorMessages[error] || `Google connection failed: ${error}`;
      toast.error(errorMessage);
      
      // Clean up URL parameters
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
            <TabsTrigger value="google-apis">
              <span className="flex items-center gap-1">
                <HardDrive className="h-4 w-4" />
                Google APIs
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
          
          <TabsContent value="google-apis">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Google API Integration
                </CardTitle>
                <CardDescription>
                  Connect Google APIs to enable powerful MCP integrations across the Google ecosystem
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <GoogleAPIConnection />
              </CardContent>
            </Card>
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
