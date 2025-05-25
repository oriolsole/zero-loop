
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Brain
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useAgentConversation, ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversations]);

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

    try {
      const conversationHistory = getConversationHistory();

      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: input,
          conversationHistory,
          userId: user.id,
          sessionId: currentSessionId,
          streaming: false
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response from AI agent');
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

      if (data.toolsUsed && data.toolsUsed.length > 0) {
        const successCount = data.toolsUsed.filter((tool: any) => tool.success).length;
        const failCount = data.toolsUsed.length - successCount;
        
        if (successCount > 0) {
          toast.success(`Used ${successCount} tool(s) successfully`, {
            description: data.toolsUsed
              .filter((tool: any) => tool.success)
              .map((tool: any) => tool.name.replace('execute_', ''))
              .join(', ')
          });
        }
        
        if (failCount > 0) {
          toast.error(`${failCount} tool(s) failed`, {
            description: 'Check the conversation for details'
          });
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message', {
        description: error.message || 'Please try again'
      });

      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };

      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
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
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Agent Chat
            </CardTitle>
            <div className="flex items-center gap-2">
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
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {conversations.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                  <p className="text-sm">
                    I'm your AI agent. I can search the web, access your knowledge base, and use various tools to help you.
                  </p>
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
              
              {isLoading && (
                <div className="flex justify-start">
                  <Avatar className="h-8 w-8 mt-0.5">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 bg-secondary rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking and planning...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="border-t p-4">
          <div className="flex w-full gap-2">
            <Input
              placeholder="Ask me anything... I can search the web, access your knowledge base, and more!"
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
