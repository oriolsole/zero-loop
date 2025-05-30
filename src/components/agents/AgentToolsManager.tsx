
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { Agent, AgentToolConfig } from '@/services/agentService';
import { MCP } from '@/types/mcp';
import { useAgentToolConfigs } from '@/hooks/useAgentToolConfigs';
import { getToolIcon, getToolColor } from '@/utils/toolIcons';
import { toast } from '@/components/ui/sonner';

interface AgentToolsManagerProps {
  agent: Agent;
  availableTools: MCP[];
  onToolConfigUpdate?: () => void;
}

const AgentToolsManager: React.FC<AgentToolsManagerProps> = ({
  agent,
  availableTools,
  onToolConfigUpdate
}) => {
  const { toolConfigs, isLoading, updateToolConfig, deleteToolConfig } = useAgentToolConfigs(agent.id);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [editingConfigs, setEditingConfigs] = useState<Record<string, Partial<AgentToolConfig>>>({});
  const [hasInitializedDefaults, setHasInitializedDefaults] = useState(false);
  const [savingConfigs, setSavingConfigs] = useState<Record<string, boolean>>({});

  // Auto-enable core tools for default agents
  useEffect(() => {
    const initializeDefaultTools = async () => {
      if (!agent.is_default || hasInitializedDefaults || isLoading || toolConfigs.length > 0) {
        return;
      }

      // Core tools that should be enabled by default for General Assistant
      const defaultToolKeys = [
        'web_search',
        'knowledge_search', 
        'web_scraper',
        'github_tools'
      ];

      const coreTools = availableTools.filter(tool => 
        defaultToolKeys.includes(tool.default_key || tool.title.toLowerCase().replace(/\s+/g, '_'))
      );

      for (const tool of coreTools) {
        try {
          await updateToolConfig(tool.id, { 
            is_active: true,
            custom_title: null,
            custom_description: null,
            priority_override: 0,
            custom_use_cases: []
          });
        } catch (error) {
          console.error(`Failed to enable default tool ${tool.title}:`, error);
        }
      }

      setHasInitializedDefaults(true);
      onToolConfigUpdate?.();
      
      if (coreTools.length > 0) {
        toast.success(`Enabled ${coreTools.length} core tools for General Assistant`);
      }
    };

    initializeDefaultTools();
  }, [agent.is_default, availableTools, toolConfigs.length, isLoading, hasInitializedDefaults, updateToolConfig, onToolConfigUpdate]);

  const handleToolToggle = async (mcpId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await updateToolConfig(mcpId, { is_active: true });
      } else {
        await deleteToolConfig(mcpId);
      }
      onToolConfigUpdate?.();
    } catch (error) {
      console.error('Error toggling tool:', error);
      toast.error('Failed to update tool configuration');
    }
  };

  const handleConfigUpdate = async (mcpId: string) => {
    const config = editingConfigs[mcpId];
    if (!config) {
      console.warn('No config to save for tool:', mcpId);
      return;
    }

    console.log('💾 Saving tool config for agent:', agent.id, 'tool:', mcpId, 'config:', config);
    
    setSavingConfigs(prev => ({ ...prev, [mcpId]: true }));
    
    try {
      // Ensure custom_use_cases is properly formatted as an array
      const processedConfig = {
        ...config,
        is_active: true, // Ensure tool remains active when saving custom config
        custom_use_cases: Array.isArray(config.custom_use_cases) 
          ? config.custom_use_cases.filter(uc => uc && uc.trim()) 
          : []
      };

      console.log('📤 Processed config being sent:', processedConfig);

      const result = await updateToolConfig(mcpId, processedConfig);
      
      if (result) {
        console.log('✅ Tool config saved successfully:', result);
        setEditingConfigs(prev => {
          const { [mcpId]: _, ...rest } = prev;
          return rest;
        });
        setExpandedTool(null);
        onToolConfigUpdate?.();
        toast.success('Tool configuration saved successfully');
      } else {
        console.error('❌ Tool config save returned null');
        toast.error('Failed to save tool configuration - no result returned');
      }
    } catch (error) {
      console.error('❌ Error saving tool config:', error);
      toast.error(`Failed to save tool configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingConfigs(prev => ({ ...prev, [mcpId]: false }));
    }
  };

  const handleConfigChange = (mcpId: string, field: keyof AgentToolConfig, value: any) => {
    console.log('🔄 Config change:', { mcpId, field, value });
    
    setEditingConfigs(prev => ({
      ...prev,
      [mcpId]: {
        ...prev[mcpId],
        [field]: value
      }
    }));
  };

  const getToolConfig = (mcpId: string): AgentToolConfig | null => {
    return toolConfigs.find(config => config.mcp_id === mcpId) || null;
  };

  const isToolEnabled = (mcpId: string): boolean => {
    const config = getToolConfig(mcpId);
    return config?.is_active || false;
  };

  const getEditingConfig = (mcpId: string): Partial<AgentToolConfig> => {
    const existingConfig = getToolConfig(mcpId);
    return editingConfigs[mcpId] || {
      custom_title: existingConfig?.custom_title || '',
      custom_description: existingConfig?.custom_description || '',
      priority_override: existingConfig?.priority_override || 0,
      custom_use_cases: existingConfig?.custom_use_cases || []
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading tool configurations...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Agent Tools Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure which tools this agent can use and customize their behavior
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {toolConfigs.filter(c => c.is_active).length} / {availableTools.length} enabled
        </Badge>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {availableTools.map((tool) => {
            const isEnabled = isToolEnabled(tool.id);
            const isExpanded = expandedTool === tool.id;
            const editingConfig = getEditingConfig(tool.id);
            const IconComponent = getToolIcon(tool.title);
            const colorClasses = getToolColor(tool.title);
            const isSaving = savingConfigs[tool.id];

            return (
              <Card key={tool.id} className={`transition-all ${isEnabled ? 'border-primary/20 bg-primary/5' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg border ${colorClasses}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{tool.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{tool.description}</p>
                        </div>
                      </div>
                      
                      {tool.category && (
                        <Badge variant="secondary" className="text-xs">
                          {tool.category}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToolToggle(tool.id, checked)}
                      />
                      {isEnabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedTool(isExpanded ? null : tool.id)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isEnabled && isExpanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`title-${tool.id}`}>Custom Title</Label>
                          <Input
                            id={`title-${tool.id}`}
                            value={editingConfig.custom_title || ''}
                            onChange={(e) => handleConfigChange(tool.id, 'custom_title', e.target.value || null)}
                            placeholder={tool.title}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`priority-${tool.id}`}>Priority Override</Label>
                          <Input
                            id={`priority-${tool.id}`}
                            type="number"
                            value={editingConfig.priority_override || 0}
                            onChange={(e) => handleConfigChange(tool.id, 'priority_override', parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`description-${tool.id}`}>Custom Description</Label>
                        <Textarea
                          id={`description-${tool.id}`}
                          value={editingConfig.custom_description || ''}
                          onChange={(e) => handleConfigChange(tool.id, 'custom_description', e.target.value || null)}
                          placeholder={tool.description}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`use-cases-${tool.id}`}>Custom Use Cases</Label>
                        <Textarea
                          id={`use-cases-${tool.id}`}
                          value={(editingConfig.custom_use_cases || []).join('\n')}
                          onChange={(e) => {
                            const useCases = e.target.value.split('\n').filter(line => line.trim());
                            handleConfigChange(tool.id, 'custom_use_cases', useCases);
                          }}
                          placeholder="Enter one use case per line..."
                          className="min-h-[60px]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Describe specific scenarios where this agent should use this tool
                        </p>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExpandedTool(null);
                            setEditingConfigs(prev => {
                              const { [tool.id]: _, ...rest } = prev;
                              return rest;
                            });
                          }}
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleConfigUpdate(tool.id)}
                          className="gap-2"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          {isSaving ? 'Saving...' : 'Save Configuration'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AgentToolsManager;
