
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MessageSquare, 
  Settings,
  PanelLeft,
  Plus,
  Loader2,
  RefreshCw,
  Edit3,
  ChevronDown
} from 'lucide-react';
import { ModelProvider } from '@/services/modelProviderService';
import { Agent } from '@/services/agentService';
import AgentSelector from '@/components/agents/AgentSelector';
import { useNavigate } from 'react-router-dom';
import { getOpenAIModels, getNpawModels } from '@/services/modelProviderService';

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
  onModelChange?: (modelId: string) => void;
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
  onAgentChange,
  onModelChange
}) => {
  const navigate = useNavigate();
  const [isChangingModel, setIsChangingModel] = useState(false);

  // Get all available models
  const openAIModels = getOpenAIModels();
  const npawModels = getNpawModels();

  const handleAgentChange = (agent: Agent) => {
    if (onAgentChange) {
      onAgentChange(agent);
    }
  };

  const handleManageAgents = () => {
    navigate('/agents');
  };

  const handleModelChange = async (modelId: string) => {
    if (!currentAgent || !onModelChange) return;
    
    setIsChangingModel(true);
    try {
      await onModelChange(modelId);
    } catch (error) {
      console.error('Failed to change model:', error);
    } finally {
      setIsChangingModel(false);
    }
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
      return 'bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500/20';
    }
    
    // OpenAI models (default)
    return 'bg-green-500/10 text-green-700 border-green-200 hover:bg-green-500/20';
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'npaw':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'npaw':
        return 'NPAW';
      default:
        return provider.toUpperCase();
    }
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
          
          {/* Clickable Model chip with dropdown */}
          {currentAgent?.model && onModelChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={`text-xs cursor-pointer transition-colors ${getModelChipColor(currentAgent.model)} flex items-center gap-1`}
                >
                  {isChangingModel ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      {formatModelName(currentAgent.model)}
                      <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getProviderBadgeColor('openai')}`}
                    >
                      {getProviderLabel('openai')}
                    </Badge>
                  </DropdownMenuLabel>
                  {openAIModels.map((model) => (
                    <DropdownMenuItem 
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className={currentAgent.model === model.id ? 'bg-accent' : ''}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        {model.description && (
                          <span className="text-xs text-muted-foreground">
                            {model.description}
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getProviderBadgeColor('npaw')}`}
                    >
                      {getProviderLabel('npaw')}
                    </Badge>
                  </DropdownMenuLabel>
                  {npawModels.map((model) => (
                    <DropdownMenuItem 
                      key={model.id}
                      onClick={() => handleModelChange(model.id)}
                      className={currentAgent.model === model.id ? 'bg-accent' : ''}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                        {model.description && (
                          <span className="text-xs text-muted-foreground">
                            {model.description}
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {useCustomPrompt && (
              <Badge variant="secondary" className="text-xs">
                Custom Prompt
              </Badge>
            )}
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
            onClick={onOpenPromptEditor}
            className="text-muted-foreground hover:text-foreground"
            title="Edit System Prompt"
          >
            <Edit3 className="h-4 w-4" />
          </Button>

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
