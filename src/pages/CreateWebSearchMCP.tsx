
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WebSearchMCP from '@/components/knowledge/WebSearchMCP';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const CreateWebSearchMCP: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/knowledge')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Knowledge Management
        </Button>
      </div>
      
      <div className="flex justify-center">
        <WebSearchMCP />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>About Web Search MCP</CardTitle>
          <CardDescription>
            Learn about the Web Search MCP and how it works
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">How it works:</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Uses the existing Google Search edge function</li>
              <li>Sends search queries to Google Custom Search API</li>
              <li>Returns structured results with titles, links, and snippets</li>
              <li>Integrates seamlessly with your knowledge management system</li>
            </ol>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Parameters:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>query</strong> (required): The search term or phrase</li>
              <li><strong>limit</strong> (optional): Number of results to return (default: 5)</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Example Usage:</h3>
            <div className="bg-muted p-3 rounded-md text-sm font-mono">
              <div>query: "artificial intelligence trends 2024"</div>
              <div>limit: 10</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateWebSearchMCP;
