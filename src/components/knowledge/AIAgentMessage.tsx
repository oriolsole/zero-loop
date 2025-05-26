
import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, User, Wrench, Brain, ChevronDown, ChevronRight, Search, Github, Database, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';

interface AIAgentMessageProps {
  message: ConversationMessage;
}

const AIAgentMessage: React.FC<AIAgentMessageProps> = ({ message }) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageIcon = () => {
    if (message.role === 'user') return <User className="h-4 w-4" />;
    
    switch (message.messageType) {
      case 'analysis':
        return <Brain className="h-4 w-4 text-purple-500" />;
      case 'planning':
        return <Search className="h-4 w-4 text-blue-500" />;
      case 'execution':
        return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'tool-update':
        return message.isStreaming ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getMessageStyle = () => {
    if (message.role === 'user') return 'bg-primary text-primary-foreground';
    
    switch (message.messageType) {
      case 'analysis':
        return 'bg-card border border-border border-l-4 border-l-purple-500 text-card-foreground';
      case 'planning':
        return 'bg-card border border-border border-l-4 border-l-blue-500 text-card-foreground';
      case 'execution':
        return 'bg-card border border-border border-l-4 border-l-orange-500 text-card-foreground';
      case 'tool-update':
        return 'bg-card border border-border border-l-4 border-l-green-500 text-card-foreground';
      default:
        return 'bg-muted border border-border text-muted-foreground';
    }
  };

  const getMessageTitle = () => {
    switch (message.messageType) {
      case 'analysis':
        return 'Analyzing Request';
      case 'planning':
        return 'Planning Execution';
      case 'execution':
        return 'Executing Tools';
      case 'tool-update':
        return 'Tool Progress';
      default:
        return null;
    }
  };

  return (
    <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {message.role !== 'user' && (
        <Avatar className="h-8 w-8 mt-0.5">
          <AvatarFallback className="bg-secondary">
            {getMessageIcon()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div 
        className={`rounded-lg px-4 py-3 max-w-[80%] shadow-sm ${getMessageStyle()}`}
      >
        {getMessageTitle() && (
          <div className="flex items-center gap-2 mb-2 text-sm font-medium">
            {getMessageIcon()}
            <span>{getMessageTitle()}</span>
          </div>
        )}
        
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        
        {/* Tool Progress Display */}
        {message.toolProgress && message.toolProgress.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.toolProgress.map((tool, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {tool.status === 'completed' ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : tool.status === 'failed' ? (
                  <XCircle className="h-3 w-3 text-red-500" />
                ) : (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                )}
                <span className="text-foreground">{tool.displayName || tool.name.replace('execute_', '')}</span>
                {tool.status === 'completed' && (
                  <Badge variant="secondary" className="text-xs">Done</Badge>
                )}
                {tool.status === 'failed' && (
                  <Badge variant="destructive" className="text-xs">Failed</Badge>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Tools Used Display */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-3 space-y-2">
            <Separator />
            <div className="flex flex-wrap gap-1">
              {message.toolsUsed.map((tool, index) => (
                <Badge 
                  key={index} 
                  variant={tool.success ? "default" : "destructive"}
                  className="text-xs"
                >
                  <Wrench className="h-3 w-3 mr-1" />
                  {tool.name.replace('execute_', '')}
                  {!tool.success && ' (failed)'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Technical Details */}
        {(message.toolDecision || message.selfReflection) && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 p-0 text-xs">
                {showDetails ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                Technical Details
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {message.toolDecision && (
                <div className="p-2 rounded bg-muted/50 border border-border border-l-2 border-l-blue-500">
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                    <Brain className="h-3 w-3" />
                    Tool Decision
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {message.toolDecision.reasoning || 'Decision made based on request analysis'}
                  </p>
                </div>
              )}
              
              {message.selfReflection && (
                <div className="p-2 rounded bg-muted/50 border border-border border-l-2 border-l-purple-500">
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                    <Brain className="h-3 w-3" />
                    Self-Reflection
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {message.selfReflection}
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        <div className="text-xs opacity-70 mt-2">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
      
      {message.role === 'user' && (
        <Avatar className="h-8 w-8 mt-0.5">
          <AvatarFallback className="bg-secondary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default AIAgentMessage;
