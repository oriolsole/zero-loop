
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  RefreshCw, 
  BarChart3, 
  Settings, 
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { unifiedMcpService } from '@/services/unifiedMcpService';
import { toast } from '@/components/ui/sonner';

const UnifiedConfigPanel: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [changes, setChanges] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const [configStats, configChanges] = await Promise.all([
        unifiedMcpService.getConfigurationStats(),
        unifiedMcpService.detectConfigurationChanges()
      ]);
      
      setStats(configStats);
      setChanges(configChanges);
    } catch (error) {
      console.error('Error loading unified config stats:', error);
      toast.error('Failed to load configuration statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

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

  const handleRefreshConfig = async () => {
    unifiedMcpService.clearCache();
    await loadStats();
    toast.success('Configuration refreshed');
  };

  if (isLoading && !stats) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading configuration...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Unified Agent Configuration</CardTitle>
            <CardDescription>
              Comprehensive view of all available MCP tools and configuration status
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefreshConfig} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExportUnified} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Unified Config
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="changes">Changes</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
                        Total Tools
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stats.totalTools}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {stats.authRequiredTools} require auth, {stats.publicTools} public
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.toolsByCategory).map(([category, count]) => (
                          <div key={category} className="flex justify-between items-center">
                            <span className="capitalize text-sm">{category}</span>
                            <Badge variant="secondary">{count as number}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Providers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(stats.toolsByProvider).map(([provider, count]) => (
                          <div key={provider} className="flex justify-between items-center">
                            <span className="capitalize text-sm">{provider}</span>
                            <Badge variant="outline">{count as number}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="changes" className="space-y-4">
              {changes && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    {changes.hasChanges ? (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    <span className="font-medium">
                      {changes.hasChanges 
                        ? 'Configuration has changes since last export' 
                        : 'Configuration is up to date'
                      }
                    </span>
                  </div>

                  {changes.newTools.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-green-600">New Tools</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {changes.newTools.map((toolId: string) => (
                            <Badge key={toolId} variant="outline" className="mr-2">
                              {toolId}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {changes.modifiedTools.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-yellow-600">Modified Tools</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {changes.modifiedTools.map((toolId: string) => (
                            <Badge key={toolId} variant="outline" className="mr-2">
                              {toolId}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {changes.removedTools.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-red-600">Removed Tools</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {changes.removedTools.map((toolId: string) => (
                            <Badge key={toolId} variant="outline" className="mr-2">
                              {toolId}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Protocol:</span>
                      <span className="ml-2">ModelContextProtocol v1.0.0</span>
                    </div>
                    <div>
                      <span className="font-medium">Sources:</span>
                      <span className="ml-2">Database + Static Files</span>
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span>
                      <span className="ml-2 flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Format:</span>
                      <span className="ml-2">Standardized MCP v1.0</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      The unified configuration combines all static MCP tool definitions 
                      with database-stored custom tools to provide a comprehensive 
                      agent configuration file. This enables any external agent to 
                      access all available tools through a single configuration.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedConfigPanel;
