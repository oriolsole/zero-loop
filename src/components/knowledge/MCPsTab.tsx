
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mcpService } from '@/services/mcpService';
import MCPGrid from './MCPGrid';
import MCPForm from './MCPForm';
import MCPChatInterface from './MCPChatInterface';
import { MCP } from '@/types/mcp';

const MCPsTab: React.FC = () => {
  const [view, setView] = useState<'grid' | 'chat'>('grid');
  const [isCreating, setIsCreating] = useState(false);
  const [editingMCP, setEditingMCP] = useState<MCP | null>(null);

  // Fetch MCPs using react-query
  const { data: mcps, isLoading, refetch } = useQuery({
    queryKey: ['mcps'],
    queryFn: mcpService.fetchMCPs
  });

  const handleCreateNew = () => {
    setEditingMCP(null);
    setIsCreating(true);
  };

  const handleEditMCP = (mcp: MCP) => {
    setEditingMCP(mcp);
    setIsCreating(true);
  };

  const handleSaveMCP = async (mcp: MCP | Omit<MCP, 'id' | 'created_at' | 'updated_at'>) => {
    if ('id' in mcp) {
      await mcpService.updateMCP(mcp.id, mcp);
    } else {
      await mcpService.createMCP(mcp);
    }
    setIsCreating(false);
    setEditingMCP(null);
    refetch();
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingMCP(null);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this MCP?');
    if (confirmed) {
      await mcpService.deleteMCP(id);
      refetch();
    }
  };

  if (isCreating) {
    return (
      <MCPForm 
        mcp={editingMCP} 
        onSave={handleSaveMCP} 
        onCancel={handleCancel} 
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Model Context Protocol (MCP) Tools</CardTitle>
          <CardDescription>
            Connect LLMs to external tools like databases, APIs, and more
          </CardDescription>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          New MCP
        </Button>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="grid" value={view} onValueChange={(v) => setView(v as 'grid' | 'chat')}>
          <TabsList className="mb-4">
            <TabsTrigger value="grid">Tools Gallery</TabsTrigger>
            <TabsTrigger value="chat">Chat with Tools</TabsTrigger>
          </TabsList>
          
          <TabsContent value="grid">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <MCPGrid 
                mcps={mcps || []} 
                onEdit={handleEditMCP} 
                onDelete={handleDelete} 
              />
            )}
          </TabsContent>
          
          <TabsContent value="chat">
            <MCPChatInterface mcps={mcps || []} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MCPsTab;
