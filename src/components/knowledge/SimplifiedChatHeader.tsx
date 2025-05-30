
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bot, MessageSquare, Plus, Settings, Loader2, RotateCcw, Edit3 } from 'lucide-react';
import { ModelProvider } from '@/services/modelProviderService';

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
  useCustomPrompt
}) => {
  return (
    <div className="border-b border-border/50 px-6 py-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">AI Assistant</h1>
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs font-medium bg-secondary/50 border-border/50">
              {modelSettings.provider.toUpperCase()}
              {modelSettings.selectedModel && ` • ${modelSettings.selectedModel}`}
            </Badge>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/30 border border-border/30">
              <RotateCcw className={`h-3 w-3 ${loopEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-xs font-medium text-muted-foreground">Loop</span>
              <Switch
                checked={loopEnabled}
                onCheckedChange={onToggleLoop}
                className="h-4 w-7 data-[state=checked]:bg-primary"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenPromptEditor}
              className={`h-8 px-3 ${useCustomPrompt ? 'bg-primary/10 border-primary/30 text-primary' : 'hover:bg-secondary/80'}`}
            >
              <Edit3 className="h-3 w-3 mr-1" />
              <span className="text-xs font-medium">Prompt</span>
              {useCustomPrompt && (
                <Badge variant="secondary" className="ml-1 text-xs px-1 py-0 h-4">
                  Custom
                </Badge>
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/settings'}
            className="h-8 w-8 p-0 hover:bg-secondary/80"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSessions}
            className="h-8 w-8 p-0 hover:bg-secondary/80"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNewSession}
            className="ml-2 h-8 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary hover:text-primary"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Chat
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedChatHeader;
