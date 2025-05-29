
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, User, RotateCcw, Lightbulb, Wrench, CheckCircle, Eye } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { ToolProgressItem } from '@/types/tools';
import MarkdownRenderer from './MarkdownRenderer';
import EnhancedToolCard from './EnhancedToolCard';

interface UnifiedMessageDisplayProps {
  message: ConversationMessage;
  activeTool?: ToolProgressItem | null;
  onFollowUpAction?: (action: string) => void;
}

const UnifiedMessageDisplay: React.FC<UnifiedMessageDisplayProps> = ({ 
  message, 
  activeTool, 
  onFollowUpAction 
}) => {
  const isUser = message.role === 'user';
  const isLoopIteration = (message.loopIteration || 0) > 0;

  const getMessageTypeIcon = () => {
    switch (message.messageType) {
      case 'loop-start':
        return <RotateCcw className="h-3 w-3 text-blue-500" />;
      case 'loop-reflection':
        return <Eye className="h-3 w-3 text-purple-500" />;
      case 'tool-executing':
        return <Wrench className="h-3 w-3 text-orange-500" />;
      case 'loop-enhancement':
        return <Lightbulb className="h-3 w-3 text-green-500" />;
      case 'loop-complete':
        return <CheckCircle className="h-3 w-3 text-emerald-500" />;
      default:
        return null;
    }
  };

  // Enhanced tool message parsing with comprehensive validation
  const parseToolMessage = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      console.log(`🔍 [TOOL-DISPLAY] Parsing tool content for message ${message.id}:`, {
        toolName: parsed.toolName || parsed.name,
        status: parsed.status,
        hasAllRequired: !!(parsed.toolName || parsed.name) && !!parsed.status
      });
      
      // Enhanced validation with multiple possible field names
      if ((parsed.toolName || parsed.name) && parsed.status) {
        const toolData = {
          toolName: parsed.toolName || parsed.name,
          displayName: parsed.displayName || parsed.toolName || parsed.name,
          status: parsed.status,
          toolCallId: parsed.toolCallId || parsed.id || `tool-${message.id}`,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          parameters: parsed.parameters || parsed.params || {},
          result: parsed.result,
          error: parsed.error,
          progress: parsed.progress
        };
        console.log(`✅ [TOOL-DISPLAY] Successfully parsed tool data:`, toolData);
        return toolData;
      }
      
      console.log(`⚠️ [TOOL-DISPLAY] Missing required fields in tool data:`, parsed);
      return null;
    } catch (error) {
      console.warn(`❌ [TOOL-DISPLAY] Failed to parse tool message for ${message.id}:`, error);
      return null;
    }
  };

  // Enhanced tool message detection
  const isToolMessage = message.messageType === 'tool-executing' && 
                        message.content.startsWith('{');
  const toolData = isToolMessage ? parseToolMessage(message.content) : null;

  console.log(`🎨 [TOOL-DISPLAY] Rendering message ${message.id}:`, {
    role: message.role,
    messageType: message.messageType,
    isToolMessage,
    toolDataPresent: !!toolData,
    toolName: toolData?.toolName || 'none',
    contentPreview: message.content.substring(0, 50) + '...'
  });

  // Enhanced tool execution message rendering with better visual feedback
  if (isToolMessage && toolData) {
    const toolProgressItem: ToolProgressItem = {
      id: toolData.toolCallId,
      name: toolData.toolName,
      displayName: toolData.displayName,
      status: toolData.status as any,
      startTime: toolData.startTime,
      endTime: toolData.endTime,
      parameters: toolData.parameters,
      result: toolData.result,
      error: toolData.error,
      progress: toolData.progress || (
        toolData.status === 'completed' ? 100 : 
        toolData.status === 'failed' ? 0 : 
        toolData.status === 'executing' ? 50 : 0
      )
    };

    console.log(`🛠️ [TOOL-DISPLAY] Rendering enhanced tool card for: ${toolData.toolName} (${toolData.status})`);

    return (
      <div className="flex gap-4 justify-start animate-in fade-in duration-200">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 max-w-4xl mr-12">
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Wrench className="h-3 w-3 text-orange-500" />
            <Badge variant="outline" className="text-xs">
              Tool Execution
            </Badge>
            {isLoopIteration && (
              <Badge variant="outline" className="text-xs bg-blue-50">
                Loop {message.loopIteration}
              </Badge>
            )}
            {/* Real-time indicator for live tool updates */}
            {toolData.status === 'executing' && (
              <Badge variant="outline" className="text-xs bg-blue-100 animate-pulse">
                Live
              </Badge>
            )}
          </div>
          
          <EnhancedToolCard tool={toolProgressItem} compact={false} />
          
          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
            <span>{message.timestamp.toLocaleTimeString()}</span>
            {toolData.status === 'executing' && (
              <span className="text-blue-600 animate-pulse">• Running live</span>
            )}
            {toolData.status === 'completed' && (
              <span className="text-green-600">• Completed</span>
            )}
            {toolData.status === 'failed' && (
              <span className="text-red-600">• Failed</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Regular message rendering with enhanced real-time indicators
  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
      {!isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex-1 max-w-4xl ${isUser ? 'flex justify-end' : ''}`}>
        <div className={`
          rounded-2xl px-4 py-3 border
          ${isUser 
            ? 'bg-primary text-primary-foreground ml-12' 
            : 'bg-secondary mr-12'
          }
        `}>
          {/* Enhanced loop iteration and message type indicator */}
          {!isUser && (isLoopIteration || message.messageType) && (
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              {getMessageTypeIcon()}
              {isLoopIteration && (
                <span className="text-foreground font-medium">Loop {message.loopIteration}</span>
              )}
              {message.messageType && (
                <Badge variant="outline" className="text-xs">
                  {message.messageType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              )}
            </div>
          )}
          
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {isUser ? (
              <p className="text-primary-foreground m-0">{message.content}</p>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </div>
          
          {/* Enhanced improvement reasoning for reflection messages */}
          {message.improvementReasoning && !isUser && message.messageType === 'loop-reflection' && (
            <div className="mt-3 p-3 bg-muted/70 border border-muted-foreground/40 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-purple-700">
                  Why I'm improving:
                </span>
              </div>
              <p className="m-0 text-muted-foreground leading-relaxed">{message.improvementReasoning}</p>
            </div>
          )}
          
          {/* Tools used indicator with enhanced display */}
          {message.toolsUsed && message.toolsUsed.length > 0 && !isUser && !isToolMessage && (
            <div className="flex flex-wrap gap-1 mt-3">
              {message.toolsUsed.map((tool, index) => (
                <Badge 
                  key={index} 
                  variant={tool.success ? "default" : "destructive"}
                  className="text-xs"
                >
                  {tool.name}
                  {tool.success ? ' ✓' : ' ✗'}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground mt-2">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      {isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-secondary">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default UnifiedMessageDisplay;
