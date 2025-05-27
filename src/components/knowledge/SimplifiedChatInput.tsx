
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { ModelProvider } from '@/services/modelProviderService';

interface SimplifiedChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  modelProvider: ModelProvider;
}

const SimplifiedChatInput: React.FC<SimplifiedChatInputProps> = ({
  input,
  onInputChange,
  onSendMessage,
  isLoading,
  modelProvider
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="border-t border-border p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex gap-3 max-w-4xl mx-auto">
        <Input
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading}
          className="flex-1 bg-background"
        />
        <Button 
          onClick={onSendMessage} 
          disabled={isLoading || !input.trim()}
          size="default"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default SimplifiedChatInput;
