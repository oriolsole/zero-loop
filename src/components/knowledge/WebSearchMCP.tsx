
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mcpService } from '@/services/mcpService';
import { toast } from '@/components/ui/sonner';
import { Search, Loader2 } from 'lucide-react';

const WebSearchMCP: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);

  const createWebSearchMCP = async () => {
    setIsCreating(true);
    
    try {
      const webSearchMCP = {
        title: "Web Search",
        description: "Search the web using Google Custom Search API to find relevant information across the internet",
        endpoint: "google-search",
        icon: "search",
        parameters: [
          {
            name: "query",
            type: "string" as const,
            description: "The search query to find relevant web results",
            required: true
          },
          {
            name: "limit",
            type: "number" as const,
            description: "Maximum number of search results to return (default: 5)",
            required: false,
            default: 5
          }
        ],
        tags: ["search", "web", "google", "information"],
        sampleUseCases: [
          "Search for latest news on a topic",
          "Find research papers or articles",
          "Look up current information about companies or technologies",
          "Find tutorials or how-to guides"
        ],
        category: "search",
        requiresAuth: false,
        isDefault: false
      };

      const result = await mcpService.createMCP(webSearchMCP);
      
      if (result) {
        toast.success('Web Search MCP created successfully!', {
          description: 'You can now use the Web Search tool in your MCPs collection.'
        });
      }
    } catch (error) {
      console.error('Error creating Web Search MCP:', error);
      toast.error('Failed to create Web Search MCP', {
        description: 'Please try again or check your connection.'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Web Search MCP
        </CardTitle>
        <CardDescription>
          Create a Web Search MCP tool that uses Google Custom Search API
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            This will create an MCP that can search the web using the existing Google Search edge function.
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Features:</Label>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Search the web with any query</li>
              <li>• Configurable result limit (default: 5)</li>
              <li>• Returns structured search results</li>
              <li>• Includes titles, links, and snippets</li>
            </ul>
          </div>
          
          <Button 
            onClick={createWebSearchMCP} 
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating MCP...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Create Web Search MCP
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebSearchMCP;
