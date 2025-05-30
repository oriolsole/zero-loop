
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
  Bot,
  Edit3
} from 'lucide-react';
import { ModelProvider } from '@/services/modelProviderService';
import { Agent } from '@/services/agentService';

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
  currentAgent
}) => {
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
          
          {currentAgent && (
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{currentAgent.name}</span>
              {currentAgent.description && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  - {currentAgent.description}
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {modelSettings.selectedModel || currentAgent?.model || 'gpt-4o'}
            </Badge>
            
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
              checked={loopEnabled}
              onCheckedChange={onToggleLoop}
              disabled={isLoading}
            />
            {loopEnabled && (
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
