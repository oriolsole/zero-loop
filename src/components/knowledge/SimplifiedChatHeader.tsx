
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

  const handleAgentChange = (agent: Agent) => {
    if (onAgentChange) {
      onAgentChange(agent);
    }
  };

  const handleManageAgents = () => {
    navigate('/agents');
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
