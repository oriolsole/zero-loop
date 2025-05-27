
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { ModelProvider } from '@/services/modelProviderService';

interface SimplifiedChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  modelProvider: ModelProvider;
  placeholder?: string;
}

const SimplifiedChatInput: React.FC<SimplifiedChatInputProps> = ({
  input,
  onInputChange,
  onSendMessage,
  isLoading,
  modelProvider,
  placeholder = "Ask me anything..."
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input && input.trim() && !isLoading) {
        onSendMessage();
      }
    }
  };

  return (
    <div className="border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="relative">
          <div className="flex gap-3 bg-secondary/30 rounded-2xl p-3 shadow-sm border border-border/50 focus-within:border-primary/30 focus-within:shadow-md transition-all duration-200">
            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg flex-shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <Input
              placeholder={placeholder}
              value={input || ''}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/70"
            />
            <Button 
              onClick={onSendMessage} 
              disabled={isLoading || !input || !input.trim()}
              size="sm"
              className="h-8 w-8 p-0 bg-primary hover:bg-primary/90 shadow-sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground/60 text-center">
            Powered by {modelProvider.toUpperCase()} • Press Enter to send
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedChatInput;
