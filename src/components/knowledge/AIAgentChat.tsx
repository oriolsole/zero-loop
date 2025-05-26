import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Send, 
  Bot, 
  User, 
  Wrench, 
  Loader2, 
  MessageSquare, 
  Plus,
  Trash2,
  Clock,
  Brain,
  Settings,
  Cloud,
  HardDrive,
  Zap,
  CheckCircle,
  XCircle,
  PlayCircle,
  AlertTriangle
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useAgentConversation, ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings, ModelProvider } from '@/services/modelProviderService';
import ToolProgressStream from './ToolProgressStream';
import { useToolProgress } from '@/hooks/useToolProgress';

// Tool Progress Component with enhanced feedback
const ToolProgress: React.FC<{ toolProgress: any[] }> = ({ toolProgress }) => {
  if (!toolProgress || toolProgress.length === 0) return null;

  return (
    <div className="mt-3 p-3 rounded-lg bg-muted/30 border">
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="h-4 w-4" />
        <span className="text-sm font-medium">Tools in Progress</span>
      </div>
      <div className="space-y-2">
        {toolProgress.map((tool, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              {tool.status === 'executing' && <PlayCircle className="h-4 w-4 text-blue-500 animate-pulse" />}
              {tool.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
              {tool.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
              <span className="text-sm">{tool.name.replace('execute_', '')}</span>
              {tool.parameters && (
                <span className="text-xs text-muted-foreground">
                  ({Object.keys(tool.parameters).join(', ')})
                </span>
              )}
            </div>
            <Badge 
              variant={tool.status === 'completed' ? 'default' : tool.status === 'failed' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {tool.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

const AIAgentChat: React.FC = () => {
  const { user } = useAuth();
  const {
    currentSessionId,
    conversations,
    sessions,
    startNewSession,
    loadSession,
    addMessage,
    getConversationHistory,
    deleteSession
  } = useAgentConversation();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [modelSettings, setModelSettings] = useState(getModelSettings());
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Add tool progress hook
  const {
    tools,
    isActive: toolsActive,
    startTool,
    updateTool,
    completeTool,
    failTool,
    clearTools,
    setToolProgress
  } = useToolProgress();
  
  // Create the missing scrollAreaRef
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversations, tools]);

  // Load model settings on component mount and when they change
  useEffect(() => {
    const loadSettings = () => {
      const settings = getModelSettings();
      setModelSettings(settings);
    };

    // Load initially
    loadSettings();

    // Listen for storage changes (when settings are updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'modelSettings') {
        loadSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getProviderIcon = (provider: ModelProvider) => {
    switch (provider) {
      case 'openai':
        return <Cloud className="h-3 w-3" />;
      case 'local':
        return <HardDrive className="h-3 w-3" />;
      case 'npaw':
        return <Zap className="h-3 w-3" />;
      default:
        return <Bot className="h-3 w-3" />;
    }
  };

  const getProviderColor = (provider: ModelProvider) => {
    switch (provider) {
      case 'openai':
        return 'bg-blue-500';
      case 'local':
        return 'bg-green-500';
      case 'npaw':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user || !currentSessionId) return;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    addMessage(userMessage);
    setInput('');
    setIsLoading(true);
    clearTools(); // Clear previous tool progress
    setDebugInfo('Starting AI agent request...');

    try {
      const conversationHistory = getConversationHistory();

      console.log('Sending message to AI agent:', {
        message: input,
        conversationHistory: conversationHistory.length,
        userId: user.id,
        sessionId: currentSessionId,
        modelSettings
      });

      setDebugInfo('Calling AI agent function...');

      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: input,
          conversationHistory,
          userId: user.id,
          sessionId: currentSessionId,
          streaming: false,
          modelSettings: modelSettings
        }
      });

      console.log('AI agent response:', { data, error });
      setDebugInfo(`AI agent response received: ${data ? 'success' : 'error'}`);

      if (error) {
        console.error('AI agent error:', error);
        throw new Error(error.message);
      }

      if (!data.success) {
        console.error('AI agent returned error:', data.error);
        throw new Error(data.error || 'Failed to get response from AI agent');
      }

      // Process tool progress if available
      if (data.toolProgress && data.toolProgress.length > 0) {
        console.log('Processing tool progress:', data.toolProgress);
        
        data.toolProgress.forEach((toolItem: any) => {
          const toolId = startTool(
            toolItem.name || 'unknown-tool',
            toolItem.name?.replace('execute_', '') || 'Unknown Tool',
            toolItem.parameters
          );

          // Simulate real-time progress updates
          if (toolItem.status === 'executing') {
            const progressInterval = setInterval(() => {
              setToolProgress(toolId, Math.min(90, Math.random() * 80 + 10));
            }, 200);

            setTimeout(() => {
              clearInterval(progressInterval);
              if (toolItem.status === 'completed') {
                completeTool(toolId, toolItem.result);
              } else if (toolItem.status === 'failed') {
                failTool(toolId, toolItem.error || 'Tool execution failed');
              }
            }, 1500);
          } else {
            // Update tool status immediately
            updateTool(toolId, {
              status: toolItem.status,
              endTime: toolItem.endTime,
              result: toolItem.result,
              error: toolItem.error
            });
          }
        });
      }

      // Process tools used for legacy support
      if (data.toolsUsed && data.toolsUsed.length > 0 && (!data.toolProgress || data.toolProgress.length === 0)) {
        console.log('Processing legacy tools used:', data.toolsUsed);
        
        data.toolsUsed.forEach((tool: any, index: number) => {
          const toolId = startTool(
            tool.name,
            tool.name.replace('execute_', ''),
            tool.parameters
          );

          // Simulate execution time
          setTimeout(() => {
            if (tool.success) {
              completeTool(toolId, tool.result);
            } else {
              failTool(toolId, tool.result?.error || 'Tool execution failed');
            }
          }, (index + 1) * 800);
        });
      }

      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        toolsUsed: data.toolsUsed || [],
        selfReflection: data.selfReflection
      };

      addMessage(assistantMessage);

      // Enhanced tool feedback
      if (data.toolsUsed && data.toolsUsed.length > 0) {
        const successCount = data.toolsUsed.filter((tool: any) => tool.success).length;
        const failCount = data.toolsUsed.length - successCount;
        
        console.log('Tool execution summary:', { 
          total: data.toolsUsed.length, 
          success: successCount, 
          failed: failCount,
          tools: data.toolsUsed 
        });
        
        if (successCount > 0) {
          const successfulTools = data.toolsUsed
            .filter((tool: any) => tool.success)
            .map((tool: any) => tool.name.replace('execute_', ''))
            .join(', ');
          
          toast.success(`Successfully used ${successCount} tool(s)`, {
            description: `Tools: ${successfulTools}`
          });
        }
        
        if (failCount > 0) {
          const failedTools = data.toolsUsed
            .filter((tool: any) => !tool.success)
            .map((tool: any) => `${tool.name.replace('execute_', '')}: ${tool.result?.error || 'Unknown error'}`)
            .join(', ');
          
          toast.error(`${failCount} tool(s) failed`, {
            description: failedTools,
            duration: 7000
          });
        }
      } else {
        console.log('No tools were used in this response');
        setDebugInfo('Response completed without tool usage');
      }

      // Check if fallback was used and show appropriate notification
      if (data.fallbackUsed) {
        toast.warning(`Using OpenAI fallback`, {
          description: `${modelSettings.provider.toUpperCase()} failed: ${data.fallbackReason}`
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setDebugInfo(`Error: ${error.message}`);
      
      toast.error('Failed to send message', {
        description: error.message || 'Please try again'
      });

      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error processing your request: ${error.message}. Please try again, or check if any required API tokens are configured in the settings.`,
        timestamp: new Date()
      };

      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
      setDebugInfo('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[700px] gap-4">
      {/* Sessions Sidebar */}
      {showSessions && (
        <Card className="w-80 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full px-4">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startNewSession}
                  className="w-full justify-start"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
                
                <Separator className="my-3" />
                
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                      session.id === currentSessionId ? 'bg-accent' : ''
                    }`}
                    onClick={() => loadSession(session.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {session.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(session.lastMessage)}</span>
                          <span>•</span>
                          <span>{session.messageCount} messages</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Main Chat Interface */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Agent Chat
              </CardTitle>
              
              {/* Enhanced Model Display */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getProviderIcon(modelSettings.provider)}
                  <span className="text-xs font-medium">
                    {modelSettings.provider.toUpperCase()}
                    {modelSettings.selectedModel && ` - ${modelSettings.selectedModel}`}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${getProviderColor(modelSettings.provider)}`} />
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/settings'}
              >
                <Settings className="h-4 w-4 mr-2" />
                Model Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSessions(!showSessions)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {showSessions ? 'Hide' : 'Show'} History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={startNewSession}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              {debugInfo}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {conversations.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                  <p className="text-sm mb-4">
                    I'm your AI agent with access to various tools including GitHub, web search, and knowledge base search.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs mb-2">
                    <span>Currently using:</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {getProviderIcon(modelSettings.provider)}
                      <span className="font-medium">
                        {modelSettings.provider.toUpperCase()}
                        {modelSettings.selectedModel && ` - ${modelSettings.selectedModel}`}
                      </span>
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>💡 Tip: For GitHub access, make sure to configure your GitHub token in Settings</p>
                    <p>🔧 Available tools: Web Search, GitHub Tools, Knowledge Base Search</p>
                    <p>🎯 Try: "Search GitHub for React hooks examples" or "Find recent AI news"</p>
                  </div>
                </div>
              )}

              {conversations.map((message) => (
                <div 
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div 
                    className={`rounded-lg px-4 py-3 max-w-[80%] ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    
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

                    {message.selfReflection && (
                      <div className="mt-3 p-2 rounded bg-muted/50 border-l-2 border-primary">
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                          <Brain className="h-3 w-3" />
                          Self-Reflection
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {message.selfReflection}
                        </p>
                      </div>
                    )}
                    
                    <div className="text-xs opacity-70 mt-2">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {/* Enhanced loading state with real-time tool progress */}
              {isLoading && (
                <div className="flex justify-start">
                  <Avatar className="h-8 w-8 mt-0.5">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 bg-secondary rounded-lg px-4 py-3 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">
                        Thinking with {modelSettings.provider.toUpperCase()}...
                      </span>
                    </div>
                    
                    {/* Real-time Tool Progress Display */}
                    {(toolsActive || tools.length > 0) && (
                      <ToolProgressStream 
                        tools={tools}
                        isActive={toolsActive}
                        className="mt-3"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Show completed tool progress after loading finishes */}
              {!isLoading && tools.length > 0 && (
                <div className="flex justify-start">
                  <Avatar className="h-8 w-8 mt-0.5">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 max-w-[80%]">
                    <ToolProgressStream 
                      tools={tools}
                      isActive={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="border-t p-4">
          <div className="flex w-full gap-2">
            <Input
              placeholder={`Ask me anything! I can search GitHub, the web, and access your knowledge base! (Using ${modelSettings.provider.toUpperCase()})`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AIAgentChat;
