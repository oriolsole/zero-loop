
import React from 'react';
import { CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Cloud, HardDrive, Zap, Settings, MessageSquare, Plus, Loader2 } from 'lucide-react';
import { ModelProvider } from '@/services/modelProviderService';

interface AIAgentHeaderProps {
  modelSettings: {
    provider: ModelProvider;
    selectedModel?: string;
  };
  showSessions: boolean;
  onToggleSessions: () => void;
  onNewSession: () => void;
  isLoading: boolean;
  isCreatingSession?: boolean;
}

const AIAgentHeader: React.FC<AIAgentHeaderProps> = ({
  modelSettings,
  showSessions,
  onToggleSessions,
  onNewSession,
  isLoading,
  isCreatingSession = false
}) => {
  const getProviderIcon = (provider: ModelProvider) => {
    switch (provider) {
      case 'openai':
        return <Cloud className="h-3 w-3" />;
      case 'local':
        return <HardDrive className="h-3 w-3" />;
      case 'npaw':
        return <Zap className="h-3 w-3" />;
      default:
        return <Bot className="h-3 w-3" />;
    }
  };

  const getProviderColor = (provider: ModelProvider) => {
    switch (provider) {
      case 'openai':
        return 'bg-blue-500';
      case 'local':
        return 'bg-green-500';
      case 'npaw':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleNewSessionClick = () => {
    console.log('New Session button clicked');
    try {
      onNewSession();
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  const handleToggleSessionsClick = () => {
    console.log('Toggle Sessions button clicked');
    try {
      onToggleSessions();
    } catch (error) {
      console.error('Error toggling sessions:', error);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Agent Chat
          {isLoading && (
            <span className="text-sm text-muted-foreground ml-2">Thinking...</span>
          )}
        </CardTitle>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            {getProviderIcon(modelSettings.provider)}
            <span className="text-xs font-medium">
              {modelSettings.provider.toUpperCase()}
              {modelSettings.selectedModel && ` - ${modelSettings.selectedModel}`}
            </span>
            <div className={`w-2 h-2 rounded-full ${getProviderColor(modelSettings.provider)}`} />
          </Badge>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/settings'}
        >
          <Settings className="h-4 w-4 mr-2" />
          Model Settings
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleSessionsClick}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {showSessions ? 'Hide' : 'Show'} History
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewSessionClick}
          disabled={isCreatingSession || isLoading}
        >
          {isCreatingSession ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          New Chat
        </Button>
      </div>
    </div>
  );
};

export default AIAgentHeader;
