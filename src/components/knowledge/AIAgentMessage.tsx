
import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, User, Brain, ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2, Lightbulb, ArrowRight } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';

interface AIAgentMessageProps {
  message: ConversationMessage;
  onFollowUpAction?: (action: string) => void;
}

const AIAgentMessage: React.FC<AIAgentMessageProps> = ({ message, onFollowUpAction }) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageIcon = () => {
    if (message.role === 'user') return <User className="h-4 w-4" />;
    
    switch (message.messageType) {
      case 'planning':
        return <Brain className="h-4 w-4 text-purple-500" />;
      case 'step-executing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'step-completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getMessageStyle = () => {
    if (message.role === 'user') return 'bg-primary text-primary-foreground ml-12';
    
    switch (message.messageType) {
      case 'planning':
        return 'bg-purple-900/20 border border-purple-500/30 mr-12';
      case 'step-executing':
        return 'bg-blue-900/20 border border-blue-500/30 mr-12';
      case 'step-completed':
        return 'bg-green-900/20 border border-green-500/30 mr-12';
      default:
        return 'bg-secondary/50 border border-border mr-12';
    }
  };

  const shouldShowAIReasoning = () => {
    return message.aiReasoning && (message.messageType === 'planning' || message.messageType === 'step-executing' || message.messageType === 'step-completed');
  };

  return (
    <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {message.role !== 'user' && (
        <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
          <AvatarFallback className="bg-secondary">
            {getMessageIcon()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`rounded-lg px-4 py-3 max-w-[80%] shadow-sm ${getMessageStyle()}`}>
        {/* Main message content */}
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        
        {/* AI Reasoning (Lovable-style purple italic text) */}
        {shouldShowAIReasoning() && (
          <div className="mt-2 text-sm text-purple-400 italic">
            <Brain className="h-3 w-3 inline mr-1" />
            {message.aiReasoning}
          </div>
        )}

        {/* Step Progress Status */}
        {message.stepDetails && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {message.stepDetails.tool.replace('execute_', '')}
            </Badge>
            {message.stepDetails.status === 'executing' && (
              <span className="text-xs text-blue-400">{message.stepDetails.progressUpdate}</span>
            )}
          </div>
        )}
        
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
                  {tool.name.replace('execute_', '')}
                  {!tool.success && ' (failed)'}
                </Badge>
              ))}
            </div>
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

        {/* Collapsible Step Details */}
        {message.stepDetails?.result && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 p-0 text-xs text-muted-foreground hover:text-foreground">
                {showDetails ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                View Details
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                <div className="text-xs font-medium text-muted-foreground mb-2">Tool Result:</div>
                <div className="text-sm text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {typeof message.stepDetails.result === 'string' 
                    ? message.stepDetails.result.length > 1000 
                      ? `${message.stepDetails.result.substring(0, 1000)}...` 
                      : message.stepDetails.result
                    : JSON.stringify(message.stepDetails.result, null, 2)
                  }
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Collapsible Technical Details for other message types */}
        {(message.toolDecision || message.selfReflection) && !message.stepDetails && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 p-0 text-xs text-muted-foreground hover:text-foreground">
                {showDetails ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                Technical Details
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {message.toolDecision && (
                <div className="p-2 rounded bg-secondary/30 border border-border border-l-2 border-l-blue-500">
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
                <div className="p-2 rounded bg-secondary/30 border border-border border-l-2 border-l-purple-500">
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
