
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mcpService } from '@/services/mcpService';
import MCPGrid from './MCPGrid';
import MCPForm from './MCPForm';
import MCPChatInterface from './MCPChatInterface';
import { MCP } from '@/types/mcp';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const MCPsTab: React.FC = () => {
  const [view, setView] = useState<'grid' | 'chat'>('grid');
  const [isCreating, setIsCreating] = useState(false);
  const [editingMCP, setEditingMCP] = useState<MCP | null>(null);
  const [filter, setFilter] = useState<'all' | 'default' | 'custom'>('all');
  const { user } = useAuth();

  // Fetch MCPs using react-query
  const { data: mcps, isLoading, refetch } = useQuery({
    queryKey: ['mcps'],
    queryFn: mcpService.fetchMCPs,
    // Don't retry on error - we'll handle retries for seeding separately
    retry: false
  });

  // Seed default MCPs on component mount, but only if user is authenticated
  useEffect(() => {
    const seedDefaultTools = async () => {
      if (user) {
        console.log('User authenticated, seeding default MCPs:', user.id);
        try {
          await mcpService.seedDefaultMCPs(user.id);
          refetch();
        } catch (error) {
          console.error('Error in seedDefaultTools:', error);
        }
      } else {
        console.log('User not authenticated yet, delaying MCP seeding');
      }
    };
    
    seedDefaultTools();
  }, [user, refetch]);

  // If user changes, attempt to seed MCPs again
  useEffect(() => {
    if (user) {
      mcpService.seedDefaultMCPs(user.id)
        .then(() => refetch())
        .catch(error => console.error('Failed to seed MCPs on user change:', error));
    }
  }, [user?.id, refetch]);

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
    const mcp = mcps?.find(m => m.id === id);
    
    // Prevent deletion of default MCPs
    if (mcp?.isDefault) {
      alert('Default MCPs cannot be deleted. You can create a custom copy instead.');
      return;
    }
    
    const confirmed = window.confirm('Are you sure you want to delete this MCP?');
    if (confirmed) {
      await mcpService.deleteMCP(id);
      refetch();
    }
  };

  const handleCloneMCP = async (id: string) => {
    await mcpService.cloneMCP(id);
    refetch();
  };

  // Filter MCPs based on the selected filter
  const filteredMCPs = React.useMemo(() => {
    if (!mcps) return [];
    
    switch (filter) {
      case 'default':
        return mcps.filter(mcp => mcp.isDefault);
      case 'custom':
        return mcps.filter(mcp => !mcp.isDefault);
      default:
        return mcps;
    }
  }, [mcps, filter]);

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
            <div className="flex items-center gap-2 mb-4">
              <div className="text-sm font-medium">Filter:</div>
              <Badge 
                variant={filter === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilter('all')}
              >
                All
              </Badge>
              <Badge 
                variant={filter === 'default' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilter('default')}
              >
                Default
              </Badge>
              <Badge 
                variant={filter === 'custom' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFilter('custom')}
              >
                Custom
              </Badge>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMCPs.length > 0 ? (
              <MCPGrid 
                mcps={filteredMCPs} 
                onEdit={handleEditMCP} 
                onDelete={handleDelete} 
                onClone={handleCloneMCP}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {user ? (
                  <>
                    <p>No MCPs found. {filter !== 'all' && 'Try changing the filter.'}</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => mcpService.seedDefaultMCPs(user.id).then(() => refetch())}
                    >
                      Retry Seeding Default MCPs
                    </Button>
                  </>
                ) : (
                  <p>Please sign in to view and manage MCPs</p>
                )}
              </div>
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
