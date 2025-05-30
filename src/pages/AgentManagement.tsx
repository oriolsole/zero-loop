import React, { useState } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { useAgentManagement } from '@/hooks/useAgentManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Bot, Edit, Trash2, Crown } from 'lucide-react';
import { Agent } from '@/services/agentService';
import AgentFormModal from '@/components/agents/AgentFormModal';
import { toast } from '@/components/ui/sonner';

const AgentManagement: React.FC = () => {
  const { agents, defaultAgent, isLoading, createAgent, updateAgent, deleteAgent } = useAgentManagement();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const handleCreateAgent = async (agentData: any) => {
    const success = await createAgent(agentData);
    if (success) {
      setIsCreateModalOpen(false);
    }
  };

  const handleEditAgent = async (agentData: any) => {
    if (!editingAgent) return;
    
    const success = await updateAgent({
      id: editingAgent.id,
      ...agentData
    });
    
    if (success) {
      setEditingAgent(null);
    }
  };

  const handleDeleteAgent = async (agent: Agent) => {
    if (agent.is_default) {
      toast.error('Cannot delete the default agent');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      await deleteAgent(agent.id);
    }
  };

  const handleSetDefault = async (agent: Agent) => {
    await updateAgent({
      id: agent.id,
      is_default: true
    });
  };

  const handleEditClick = (agent: Agent) => {
    console.log('🔧 [EDIT DEBUG] Edit button clicked for agent:', agent.name);
    console.log('🔧 [EDIT DEBUG] Full agent object:', agent);
    console.log('🔧 [EDIT DEBUG] Agent system_prompt:', agent.system_prompt);
    console.log('🔧 [EDIT DEBUG] Agent system_prompt length:', agent.system_prompt?.length || 0);
    
    setEditingAgent(agent);
    
    // Verify the state was set correctly
    setTimeout(() => {
      console.log('🔧 [EDIT DEBUG] editingAgent state after set:', editingAgent);
    }, 100);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="text-center">Loading agents...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agent Management</h1>
            <p className="text-muted-foreground">Create and manage your AI agents</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Agent
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                  </div>
                  {agent.is_default && (
                    <Badge variant="default" className="gap-1">
                      <Crown className="h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </div>
                {agent.description && (
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                )}
                {/* Debug info for system prompt */}
                <div className="text-xs text-muted-foreground">
                  System prompt: {agent.system_prompt ? `${agent.system_prompt.length} chars` : 'None'}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{agent.model}</Badge>
                  {agent.loop_enabled && (
                    <Badge variant="secondary">Self-Improve</Badge>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(agent)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  
                  {!agent.is_default && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(agent)}
                      >
                        <Crown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAgent(agent)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {agents.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first AI agent to get started
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Agent
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AgentFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAgent}
        mode="create"
      />

      <AgentFormModal
        isOpen={!!editingAgent}
        onClose={() => {
          console.log('🔧 [EDIT DEBUG] Modal closed, clearing editingAgent');
          setEditingAgent(null);
        }}
        onSubmit={handleEditAgent}
        mode="edit"
        agent={editingAgent}
      />
    </MainLayout>
  );
};

export default AgentManagement;
