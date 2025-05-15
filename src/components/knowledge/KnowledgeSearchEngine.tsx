
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Brain, Database, Globe, BookText, Info } from "lucide-react";
import { knowledgeSearchEngineMetadata } from '@/engines/knowledgeSearchEngine';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const KnowledgeSearchEngine: React.FC = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{knowledgeSearchEngineMetadata.name}</CardTitle>
              <CardDescription>{knowledgeSearchEngineMetadata.description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline">{knowledgeSearchEngineMetadata.version}</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <Alert variant="info" className="mb-4 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertTitle>Using local LLM models</AlertTitle>
          <AlertDescription className="text-sm">
            When using local LM Studio models, you need to make your local server accessible through a tunnel 
            like ngrok or localtunnel. Edge functions cannot access localhost directly since they run in the cloud.
          </AlertDescription>
        </Alert>
        
        <Tabs defaultValue="capabilities">
          <TabsList className="mb-4">
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
            <TabsTrigger value="sources">Knowledge Sources</TabsTrigger>
          </TabsList>
          
          <TabsContent value="capabilities" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knowledgeSearchEngineMetadata.capabilities.map((capability, i) => (
                <div key={i} className="flex items-center gap-2 p-3 border rounded-md">
                  <BookText className="h-4 w-4 text-primary" />
                  <span className="text-sm">{capability}</span>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="sources" className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <Database className="h-5 w-5 text-blue-500 mt-1" />
                <div>
                  <h4 className="font-medium">Knowledge Base</h4>
                  <p className="text-sm text-muted-foreground">Uploaded documents, text, and structured knowledge</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <Brain className="h-5 w-5 text-purple-500 mt-1" />
                <div>
                  <h4 className="font-medium">Knowledge Nodes</h4>
                  <p className="text-sm text-muted-foreground">Insights and patterns discovered during learning loops</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <Globe className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h4 className="font-medium">Web Search</h4>
                  <p className="text-sm text-muted-foreground">Real-time information from the internet</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-center">
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => window.location.href = '/knowledge?tab=search'}
          >
            <Search className="h-4 w-4" />
            <span>Go to Knowledge Search</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default KnowledgeSearchEngine;
