
import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, User, ChevronDown, ChevronRight, CheckCircle, XCircle, ArrowRight, Brain, Cog, Target, Copy, Database, Lightbulb } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import MarkdownRenderer from './MarkdownRenderer';
import { toast } from '@/components/ui/sonner';

interface AIAgentMessageProps {
  message: ConversationMessage;
  onFollowUpAction?: (action: string) => void;
}

const AIAgentMessage: React.FC<AIAgentMessageProps> = ({ message, onFollowUpAction }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showToolDecision, setShowToolDecision] = useState(false);
  const [showKnowledgeUsed, setShowKnowledgeUsed] = useState(false);
  const [showLearningInsights, setShowLearningInsights] = useState(false);

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

  const renderKnowledgeResult = (knowledgeItem: any) => {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          {knowledgeItem.name} ({knowledgeItem.searchMode || 'unknown'} search):
        </div>
        <div className="max-h-48 overflow-y-auto">
          {knowledgeItem.result && (
            <pre className="text-sm text-foreground whitespace-pre-wrap bg-secondary/20 p-2 rounded">
              {JSON.stringify(knowledgeItem.result, null, 2)}
            </pre>
          )}
          {knowledgeItem.sources && knowledgeItem.sources.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Sources:</div>
              {knowledgeItem.sources.map((source: any, idx: number) => (
                <div key={idx} className="text-xs bg-secondary/30 p-2 rounded">
                  <div className="font-medium">{source.title}</div>
                  <div className="text-muted-foreground">{source.snippet}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Relevance: {(source.relevanceScore * 100).toFixed(1)}% | Type: {source.sourceType}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLearningInsight = (insight: any) => {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          {insight.name}:
        </div>
        <div className="max-h-48 overflow-y-auto">
          <pre className="text-sm text-foreground whitespace-pre-wrap bg-secondary/20 p-2 rounded">
            {JSON.stringify(insight.result, null, 2)}
          </pre>
        </div>
      </div>
    );
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
        
        {/* Knowledge Sources Used Display */}
        {message.knowledgeUsed && message.knowledgeUsed.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {message.knowledgeUsed.map((knowledge, index) => (
              <Badge 
                key={index} 
                variant={knowledge.success ? "default" : "destructive"}
                className="text-xs"
              >
                {knowledge.success ? <Database className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                Knowledge Retrieved
              </Badge>
            ))}
          </div>
        )}

        {/* Learning Insights Display */}
        {message.learningInsights && message.learningInsights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {message.learningInsights.map((insight, index) => (
              <Badge 
                key={index} 
                variant={insight.success ? "secondary" : "destructive"}
                className="text-xs"
              >
                {insight.success ? <Lightbulb className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                Learning Generated
              </Badge>
            ))}
          </div>
        )}

        {/* Reasoning Trail Sections */}
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

        {/* Knowledge Sources Used Details */}
        {message.knowledgeUsed && message.knowledgeUsed.length > 0 && (
          <Collapsible open={showKnowledgeUsed} onOpenChange={setShowKnowledgeUsed} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 p-0 text-xs text-muted-foreground hover:text-foreground">
                {showKnowledgeUsed ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                <Database className="h-3 w-3 mr-1" />
                Knowledge Sources Used
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {message.knowledgeUsed.map((knowledge, index) => (
                <div key={index} className="p-3 bg-secondary/30 rounded-lg border border-border">
                  {renderKnowledgeResult(knowledge)}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Learning Insights Details */}
        {message.learningInsights && message.learningInsights.length > 0 && (
          <Collapsible open={showLearningInsights} onOpenChange={setShowLearningInsights} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 p-0 text-xs text-muted-foreground hover:text-foreground">
                {showLearningInsights ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                <Lightbulb className="h-3 w-3 mr-1" />
                Learning Insights Generated
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {message.learningInsights.map((insight, index) => (
                <div key={index} className="p-3 bg-secondary/30 rounded-lg border border-border">
                  {renderLearningInsight(insight)}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
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
