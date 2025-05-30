
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  MessageSquare, 
  Settings,
  PanelLeft,
  Plus,
  Loader2,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { ModelProvider } from '@/services/modelProviderService';
import { Agent } from '@/services/agentService';
import AgentSelector from '@/components/agents/AgentSelector';
import ToolsIndicator from '@/components/agents/ToolsIndicator';
import { useAvailableMCPs } from '@/hooks/useAvailableMCPs';
import { useNavigate } from 'react-router-dom';

interface SimplifiedChatHeaderProps {
  modelSettings: {
    provider: ModelProvider;
    selectedModel?: string;
  };
  showSessions: boolean;
  onToggleSessions: () => void;
  onNewSession: () => void;
  isLoading: boolean;
  loopEnabled: boolean;
  onToggleLoop: (enabled: boolean) => void;
  onOpenPromptEditor: () => void;
  useCustomPrompt: boolean;
  currentAgent?: Agent | null;
  onAgentChange?: (agent: Agent) => void;
}

const SimplifiedChatHeader: React.FC<SimplifiedChatHeaderProps> = ({
  modelSettings,
  showSessions,
  onToggleSessions,
  onNewSession,
  isLoading,
  loopEnabled,
  onToggleLoop,
  onOpenPromptEditor,
  useCustomPrompt,
  currentAgent,
  onAgentChange
}) => {
  const navigate = useNavigate();
  const { mcps: availableTools } = useAvailableMCPs();

  const handleAgentChange = (agent: Agent) => {
    if (onAgentChange) {
      onAgentChange(agent);
    }
  };

  const handleManageAgents = () => {
    navigate('/agents');
  };

  // Helper function to format model display name
  const formatModelName = (modelId: string): string => {
    // Convert technical model IDs to readable names
    const modelDisplayNames: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4.5': 'GPT-4.5',
      'gpt-4.1': 'GPT-4.1',
      'gpt-4.1-mini': 'GPT-4.1 Mini',
      'gpt-4.1-nano': 'GPT-4.1 Nano',
      'o1': 'O1',
      'o1-mini': 'O1 Mini',
      'o1-pro': 'O1 Pro',
      'o3': 'O3',
      'o3-mini': 'O3 Mini',
      'o4-mini': 'O4 Mini',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'gpt-3.5-turbo-16k': 'GPT-3.5 Turbo 16K',
      'text-davinci-003': 'Davinci 003',
      'code-davinci-002': 'Code Davinci',
      'DeepSeek-V3': 'DeepSeek V3',
      'Mistral7B': 'Mistral 7B'
    };
    
    return modelDisplayNames[modelId] || modelId;
  };

  // Helper function to get provider-specific colors
  const getModelChipColor = (modelId: string): string => {
    // NPAW models
    if (['DeepSeek-V3', 'Mistral7B'].includes(modelId)) {
      return 'bg-blue-500/10 text-blue-700 border-blue-200';
    }
    
    // OpenAI models (default)
    return 'bg-green-500/10 text-green-700 border-green-200';
  };

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSessions}
            className="text-muted-foreground hover:text-foreground"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-5" />
          
          <AgentSelector
            currentAgent={currentAgent}
            onAgentChange={handleAgentChange}
            onManageAgents={handleManageAgents}
          />
          
          <div className="flex items-center gap-2">
            {/* Model chip - subtle indicator of current model */}
            {currentAgent?.model && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getModelChipColor(currentAgent.model)}`}
              >
                {formatModelName(currentAgent.model)}
              </Badge>
            )}
            
            {/* Tools indicator - subtle icons showing available tools */}
            <ToolsIndicator 
              agent={currentAgent} 
              availableTools={availableTools}
            />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Prompt type badge with edit pencil */}
            <Badge 
              variant={useCustomPrompt ? "default" : "secondary"} 
              className="text-xs"
            >
              {useCustomPrompt ? 'Custom Prompt' : 'Default Prompt'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenPromptEditor}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Edit System Prompt"
            >
              <Edit3 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor="loop-toggle" className="text-xs font-medium">
              Self-Improve
            </Label>
            <Switch
              id="loop-toggle"
              checked={currentAgent?.loop_enabled || loopEnabled}
              onCheckedChange={onToggleLoop}
              disabled={isLoading}
            />
            {(currentAgent?.loop_enabled || loopEnabled) && (
              <RefreshCw className="h-3 w-3 text-primary" />
            )}
          </div>

          <Separator orientation="vertical" className="h-5" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onNewSession}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedChatHeader;
