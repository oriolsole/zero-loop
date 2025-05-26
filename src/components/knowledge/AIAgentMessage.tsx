
import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, User, ChevronDown, ChevronRight, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import MarkdownRenderer from './MarkdownRenderer';

interface AIAgentMessageProps {
  message: ConversationMessage;
  onFollowUpAction?: (action: string) => void;
}

const AIAgentMessage: React.FC<AIAgentMessageProps> = ({ message, onFollowUpAction }) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStyle = () => {
    if (message.role === 'user') return 'bg-primary text-primary-foreground ml-12';
    return 'bg-secondary/50 border border-border mr-12';
  };

  const renderToolResult = (result: any) => {
    if (typeof result === 'string') {
      const content = result.length > 1000 ? `${result.substring(0, 1000)}...` : result;
      return <MarkdownRenderer content={content} className="text-foreground" />;
    } else {
      return (
        <pre className="text-sm text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto bg-secondary/20 p-2 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      );
    }
  };

  return (
    <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {message.role !== 'user' && (
        <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
          <AvatarFallback className="bg-secondary">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`rounded-lg px-4 py-3 max-w-[80%] shadow-sm ${getMessageStyle()}`}>
        {/* Main message content with markdown rendering */}
        <div className="text-sm">
          <MarkdownRenderer content={message.content} />
        </div>
        
        {/* Tools Used Display */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {message.toolsUsed.map((tool, index) => (
              <Badge 
                key={index} 
                variant={tool.success ? "default" : "destructive"}
                className="text-xs"
              >
                {tool.success ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                {tool.name.replace('execute_', '')}
              </Badge>
            ))}
          </div>
        )}

        {/* Follow-up Suggestions */}
        {message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
          <div className="mt-4 p-3 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium text-indigo-300">What's next?</span>
            </div>
            <div className="space-y-1">
              {message.followUpSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onFollowUpAction?.(suggestion)}
                  className="mr-2 mb-1 text-xs bg-secondary/60 hover:bg-secondary border-indigo-500/30 text-indigo-300 hover:text-indigo-200"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Tool Results Details (if any) */}
        {message.toolsUsed && message.toolsUsed.some(tool => tool.result) && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 p-0 text-xs text-muted-foreground hover:text-foreground">
                {showDetails ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                View Tool Results
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {message.toolsUsed?.filter(tool => tool.result).map((tool, index) => (
                <div key={index} className="p-3 bg-secondary/30 rounded-lg border border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {tool.name.replace('execute_', '')} Result:
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {renderToolResult(tool.result)}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        <div className="text-xs opacity-70 mt-2">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
      
      {message.role === 'user' && (
        <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
          <AvatarFallback className="bg-secondary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default AIAgentMessage;
