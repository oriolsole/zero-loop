
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageSquare, Plus, Settings } from 'lucide-react';
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
}

const SimplifiedChatHeader: React.FC<SimplifiedChatHeaderProps> = ({
  modelSettings,
  showSessions,
  onToggleSessions,
  onNewSession,
  isLoading
}) => {
  return (
    <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">AI Assistant</h1>
        </div>
        
        <Badge variant="outline" className="text-xs">
          {modelSettings.provider.toUpperCase()}
          {modelSettings.selectedModel && ` - ${modelSettings.selectedModel}`}
        </Badge>
        
        {isLoading && (
          <span className="text-sm text-muted-foreground">Thinking...</span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.href = '/settings'}
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSessions}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNewSession}
        >
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>
    </div>
  );
};

export default SimplifiedChatHeader;
