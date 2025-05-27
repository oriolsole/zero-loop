
import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, User, ChevronDown, ChevronRight, CheckCircle, XCircle, ArrowRight, Brain, Cog, Target, Copy, Database, Lightbulb, Loader2, Settings } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import MarkdownRenderer from './MarkdownRenderer';
import KnowledgeToolResult from './KnowledgeToolResult';
import { toast } from '@/components/ui/sonner';

interface AIAgentMessageProps {
  message: ConversationMessage;
  onFollowUpAction?: (action: string) => void;
}

const AIAgentMessage: React.FC<AIAgentMessageProps> = ({ message, onFollowUpAction }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showToolDecision, setShowToolDecision] = useState(false);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStyle = () => {
    if (message.role === 'user') return 'bg-primary text-primary-foreground ml-16 shadow-sm';
    
    // Style streaming step messages differently
    if (message.messageType === 'step-executing') {
      return 'bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30 mr-16 shadow-sm';
    }
    if (message.messageType === 'step-completed') {
      return 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800/30 mr-16 shadow-sm';
    }
    if (message.messageType === 'tool-update') {
      return 'bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30 mr-16 shadow-sm';
    }
    
    return 'bg-secondary/40 border border-border/50 mr-16 shadow-sm';
  };

  const getMessageIcon = () => {
    if (message.role === 'user') return <User className="h-4 w-4 text-primary" />;
    
    if (message.messageType === 'step-executing') {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    if (message.messageType === 'step-completed') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (message.messageType === 'tool-update') {
      return <Settings className="h-4 w-4 text-amber-500" />;
    }
    
    return <Bot className="h-4 w-4" />;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const renderToolResult = (tool: any) => {
    if (tool.name === 'knowledge_retrieval' || tool.name === 'learning_generation') {
      return <KnowledgeToolResult tool={tool} />;
    }

    const result = tool.result;
    if (typeof result === 'string') {
      const content = result.length > 1000 ? `${result.substring(0, 1000)}...` : result;
      return <MarkdownRenderer content={content} className="text-foreground" />;
    } else {
      return (
        <pre className="text-sm text-foreground whitespace-pre-wrap max-h-48 overflow-y-auto bg-secondary/20 p-3 rounded-lg border border-border/30">
          {JSON.stringify(result, null, 2)}
        </pre>
      );
    }
  };

  const getToolIcon = (toolName: string) => {
    if (toolName === 'knowledge_retrieval') return <Database className="h-3 w-3 mr-1" />;
    if (toolName === 'learning_generation') return <Lightbulb className="h-3 w-3 mr-1" />;
    return <CheckCircle className="h-3 w-3 mr-1" />;
  };

  const getToolDisplayName = (toolName: string) => {
    if (toolName === 'knowledge_retrieval') return 'Knowledge Search';
    if (toolName === 'learning_generation') return 'Learning Generated';
    return toolName.replace('execute_', '').replace(/_/g, ' ');
  };

  return (
    <div className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {message.role !== 'user' && (
        <Avatar className="h-8 w-8 mt-1 flex-shrink-0 shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            {getMessageIcon()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`rounded-2xl px-5 py-4 max-w-[75%] ${getMessageStyle()}`}>
        <div className="text-sm leading-relaxed">
          <MarkdownRenderer content={message.content} />
        </div>
        
        {/* AI Reasoning Section */}
        {message.aiReasoning && (
          <Collapsible open={showReasoning} onOpenChange={setShowReasoning} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 p-0 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {showReasoning ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                <Brain className="h-3 w-3 mr-1" />
                AI Reasoning
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="bg-muted/30 p-4 rounded-xl border border-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    Thought Process
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:bg-muted/50"
                    onClick={() => copyToClipboard(message.aiReasoning!, 'AI Reasoning')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
                  {message.aiReasoning}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Tool Decision Section */}
        {message.toolDecision && (
          <Collapsible open={showToolDecision} onOpenChange={setShowToolDecision} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 p-0 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {showToolDecision ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                <Cog className="h-3 w-3 mr-1" />
                Tool Selection
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="bg-muted/30 p-4 rounded-xl border border-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    🧩 Tool Decision Process
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(message.toolDecision!.reasoning, 'Tool Decision')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Reasoning:</span>
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-snug text-foreground mt-1">
                      {message.toolDecision.reasoning}
                    </pre>
                  </div>
                  {message.toolDecision.selectedTools && message.toolDecision.selectedTools.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Selected Tools:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {message.toolDecision.selectedTools.map((tool, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tool.replace('execute_', '')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Self Reflection */}
        {message.selfReflection && (
          <div className="mt-4 bg-muted/20 p-3 rounded-xl border border-muted/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              <span className="font-medium">Self Assessment:</span>
              <span className="italic">{message.selfReflection}</span>
            </div>
          </div>
        )}
        
        {/* Tools Used Display */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.toolsUsed.map((tool, index) => (
              <Badge 
                key={index} 
                variant={tool.success ? "default" : "destructive"}
                className="text-xs shadow-sm"
              >
                {tool.success ? getToolIcon(tool.name) : <XCircle className="h-3 w-3 mr-1" />}
                {getToolDisplayName(tool.name)}
              </Badge>
            ))}
          </div>
        )}

        {/* Follow-up Suggestions */}
        {message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
          <div className="mt-5 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Continue the conversation</span>
            </div>
            <div className="space-y-2">
              {message.followUpSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onFollowUpAction?.(suggestion)}
                  className="mr-2 mb-1 text-xs bg-background/80 hover:bg-background border-primary/30 text-primary hover:text-primary/90 shadow-sm"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Tool Results Details */}
        {message.toolsUsed && message.toolsUsed.some(tool => tool.result) && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 p-0 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {showDetails ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                View Detailed Results
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              {message.toolsUsed?.filter(tool => tool.result).map((tool, index) => (
                <div key={index} className="p-4 bg-secondary/20 rounded-xl border border-border/30">
                  <div className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                    {getToolIcon(tool.name)}
                    {getToolDisplayName(tool.name)} Result
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {renderToolResult(tool)}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        <div className="text-xs opacity-60 mt-3 text-right">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
      
      {message.role === 'user' && (
        <Avatar className="h-8 w-8 mt-1 flex-shrink-0 shadow-sm">
          <AvatarFallback className="bg-primary/10 border border-primary/20">
            <User className="h-4 w-4 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default AIAgentMessage;
