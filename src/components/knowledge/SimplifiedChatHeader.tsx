
import React from 'react';
import { ModelProvider } from '@/services/modelProviderService';
import { Bot, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimplifiedChatHeaderProps {
  modelSettings: {
    provider: ModelProvider;
    selectedModel: string;
  };
}

const SimplifiedChatHeader: React.FC<SimplifiedChatHeaderProps> = ({
  modelSettings
}) => {
  return (
    <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-xl">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">AI Agent</h1>
              <p className="text-sm text-muted-foreground">
                Powered by {modelSettings.provider.toUpperCase()} • {modelSettings.selectedModel}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedChatHeader;
