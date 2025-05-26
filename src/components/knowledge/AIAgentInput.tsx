
import React from 'react';
import { CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { ModelProvider } from '@/services/modelProviderService';

interface AIAgentInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  modelProvider: ModelProvider;
}

const AIAgentInput: React.FC<AIAgentInputProps> = ({
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
    <CardFooter className="border-t p-4">
      <div className="flex w-full gap-2">
        <Input
          placeholder={`Ask me anything! Enhanced with systematic analysis and fallback strategies. (Using ${modelProvider.toUpperCase()})`}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={onSendMessage} disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </CardFooter>
  );
};

export default AIAgentInput;
