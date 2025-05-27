
import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, User, ChevronDown, ChevronRight, CheckCircle, XCircle, ArrowRight, Brain, Cog, Target, Copy, Database, Lightbulb } from 'lucide-react';
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
    if (message.role === 'user') return 'bg-primary text-primary-foreground ml-12';
    return 'bg-secondary/50 border border-border mr-12';
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const renderToolResult = (tool: any) => {
    // Check if this is a knowledge or learning tool
    if (tool.name === 'knowledge_retrieval' || tool.name === 'learning_generation') {
      return <KnowledgeToolResult tool={tool} />;
    }

    // Render regular tool results
    const result = tool.result;
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
        
        {/* Enhanced Reasoning Trail Sections */}
        {message.aiReasoning && (
          <Collapsible open={showReasoning} onOpenChange={setShowReasoning} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 p-0 text-xs text-muted-foreground hover:text-foreground">
                {showReasoning ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                <Brain className="h-3 w-3 mr-1" />
                Why this answer?
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-muted/50 p-3 rounded-md border border-muted">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    🤔 AI Reasoning
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(message.aiReasoning!, 'AI Reasoning')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-xs leading-snug text-foreground">
                  {message.aiReasoning}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {message.toolDecision && (
          <Collapsible open={showToolDecision} onOpenChange={setShowToolDecision} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 p-0 text-xs text-muted-foreground hover:text-foreground">
                {showToolDecision ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                <Cog className="h-3 w-3 mr-1" />
                Tool Selection
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-muted/50 p-3 rounded-md border border-muted">
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

        {message.selfReflection && (
          <div className="mt-3 bg-muted/30 p-2 rounded-md border border-muted">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              <span className="font-medium">Self Assessment:</span>
              <span className="italic">{message.selfReflection}</span>
            </div>
          </div>
        )}
        
        {/* Enhanced Tools Used Display */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {message.toolsUsed.map((tool, index) => (
              <Badge 
                key={index} 
                variant={tool.success ? "default" : "destructive"}
                className="text-xs"
              >
                {tool.success ? getToolIcon(tool.name) : <XCircle className="h-3 w-3 mr-1" />}
                {getToolDisplayName(tool.name)}
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

        {/* Enhanced Tool Results Details */}
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
                    {getToolDisplayName(tool.name)} Result:
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {renderToolResult(tool)}
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
