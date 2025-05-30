import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Loader2, Shield, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mcpService } from '@/services/mcpService';
import { mcpConfigService } from '@/services/mcpConfigService';
import MCPGrid from './MCPGrid';
import MCPForm from './MCPForm';
import MCPToolsSearch from './MCPToolsSearch';
import TokenManager from './TokenManager';
import { MCP } from '@/types/mcp';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import UnifiedConfigPanel from './UnifiedConfigPanel';
import { unifiedMcpService } from '@/services/unifiedMcpService';

const MCPsTab: React.FC = () => {
  const [view, setView] = useState<'grid' | 'unified'>('grid');
  const [isCreating, setIsCreating] = useState(false);
  const [editingMCP, setEditingMCP] = useState<MCP | null>(null);
  const [filter, setFilter] = useState<'all' | 'default' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [seedingAttempted, setSeedingAttempted] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const { user, isInitialized } = useAuth();

  // Fetch MCPs using react-query
  const { data: mcps, isLoading, refetch } = useQuery({
    queryKey: ['mcps'],
    queryFn: mcpService.fetchMCPs,
    retry: false,
    enabled: !!user && isInitialized
  });

  // Seed default MCPs when component mounts and user is available
  useEffect(() => {
    const seedDefaultTools = async () => {
      if (user && isInitialized && !seedingAttempted) {
        console.log('User authenticated, seeding default MCPs:', user.id);
        setSeedingAttempted(true);
        
        try {
          await mcpService.seedDefaultMCPs(user.id);
          refetch();
        } catch (error) {
          console.error('Error in seedDefaultTools:', error);
        }
      }
    };
    
    seedDefaultTools();
  }, [user, isInitialized, seedingAttempted, refetch]);

  // Get unique categories from MCPs
  const categories = useMemo(() => {
    if (!mcps) return [];
    const uniqueCategories = new Set(
      mcps.filter(mcp => mcp.category).map(mcp => mcp.category!)
    );
    return Array.from(uniqueCategories).sort();
  }, [mcps]);

  // Filter MCPs based on all criteria
  const filteredMCPs = useMemo(() => {
    if (!mcps) return [];
    
    return mcps.filter(mcp => {
      // Type filter
      if (filter === 'default' && !mcp.isDefault) return false;
      if (filter === 'custom' && mcp.isDefault) return false;
      
      // Category filter
      if (selectedCategory && mcp.category !== selectedCategory) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableFields = [
          mcp.title,
          mcp.description,
          mcp.category,
          ...(mcp.tags || []),
          ...(mcp.parameters || []).map(p => p.name)
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableFields.includes(query)) return false;
      }
      
      return true;
    });
  }, [mcps, filter, selectedCategory, searchQuery]);

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
      await mcpService.createMCP(mcp as Partial<MCP>);
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
    
    if (mcp?.isDefault) {
      toast.error('Default MCPs cannot be deleted. You can create a custom copy instead.');
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

  const handleRetrySeed = async () => {
    if (!user) {
      toast.error('Please sign in to seed default MCPs');
      return;
    }
    
    toast.loading('Seeding default MCPs...');
    try {
      await mcpService.seedDefaultMCPs(user.id);
      await refetch();
      toast.success('Default MCPs seeded successfully');
    } catch (error) {
      console.error('Error re-seeding MCPs:', error);
      toast.error('Failed to seed default MCPs');
    }
  };

  const handleExportUnified = async () => {
    try {
      toast.loading('Generating unified configuration...');
      const unifiedConfig = await unifiedMcpService.exportUnifiedConfiguration();
      
      const blob = new Blob([unifiedConfig], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'unified-agent.mcp.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Unified configuration exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export unified configuration');
    }
  };

  const handleExportAll = async () => {
    if (!mcps) return;
    
    try {
      const config = await mcpConfigService.exportConfiguration(mcps);
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mcp-agent-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Configuration exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export configuration');
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Model Context Protocol (MCP) Tools</CardTitle>
            <CardDescription>
              Connect LLMs to external tools like databases, APIs, and more
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportUnified} disabled={!mcps?.length}>
              <Download className="mr-2 h-4 w-4" />
              Export Unified
            </Button>
            <Button variant="outline" onClick={handleExportAll} disabled={!mcps?.length}>
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
            <Button variant="outline" onClick={() => setTokenDialogOpen(true)}>
              <Shield className="mr-2 h-4 w-4" />
              API Tokens
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              New MCP
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="grid" value={view} onValueChange={(v) => setView(v as 'grid' | 'unified')}>
            <TabsList className="mb-4">
              <TabsTrigger value="grid">Tools Gallery</TabsTrigger>
              <TabsTrigger value="unified">Unified Config</TabsTrigger>
            </TabsList>
            
            <TabsContent value="grid">
              <div className="space-y-4">
                <MCPToolsSearch
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filter={filter}
                  onFilterChange={setFilter}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  categories={categories}
                  totalCount={mcps?.length || 0}
                  filteredCount={filteredMCPs.length}
                />
                
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
                        <p>
                          {mcps?.length ? 'No tools match your current filters.' : 'No MCPs found.'}
                        </p>
                        {!mcps?.length && (
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={handleRetrySeed}
                          >
                            Retry Seeding Default MCPs
                          </Button>
                        )}
                      </>
                    ) : (
                      <p>Please sign in to view and manage MCPs</p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="unified">
              <UnifiedConfigPanel />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <TokenManager
        open={tokenDialogOpen}
        onOpenChange={setTokenDialogOpen}
      />
    </>
  );
};

export default MCPsTab;
