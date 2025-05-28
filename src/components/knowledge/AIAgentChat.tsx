
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useAgentConversation, ConversationMessage } from '@/hooks/useAgentConversation';
import { useAuth } from '@/contexts/AuthContext';
import { getModelSettings } from '@/services/modelProviderService';
import { useToolProgress } from '@/hooks/useToolProgress';
import { useConversationContext } from '@/hooks/useConversationContext';
import SimplifiedChatInterface from './SimplifiedChatInterface';
import SimplifiedChatInput from './SimplifiedChatInput';
import SimplifiedChatHeader from './SimplifiedChatHeader';
import SessionsSidebar from './SessionsSidebar';

const AIAgentChat: React.FC = () => {
  const { user } = useAuth();
  const {
    currentSessionId,
    conversations,
    sessions,
    isLoadingSessions,
    startNewSession,
    loadSession,
    addMessage,
    updateMessage,
    getConversationHistory,
    deleteSession
  } = useAgentConversation();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [modelSettings, setModelSettings] = useState(getModelSettings());
  const [isStreaming, setIsStreaming] = useState(false);
  const [workingStatus, setWorkingStatus] = useState('Processing your request...');
  const [currentTool, setCurrentTool] = useState<string | undefined>();

  const {
    tools,
    isActive: toolsActive,
    startTool,
    updateTool,
    completeTool,
    failTool,
    clearTools,
    setToolProgress: updateToolProgress
  } = useToolProgress();

  const {
    context,
    updateGitHubContext,
    updateSearchContext,
    storeToolResult,
    getContextForMessage
  } = useConversationContext();
  
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

    loadSettings();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'modelSettings') {
        loadSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleFollowUpAction = async (action: string) => {
    if (!user || !currentSessionId) return;

    const followUpMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: action,
      timestamp: new Date()
    };

    addMessage(followUpMessage);
    setInput('');
    
    await processMessage(action);
  };

  const parseStreamingChunk = (line: string) => {
    try {
      const parsed = JSON.parse(line);
      console.log('Parsed streaming chunk:', parsed);
      
      // Handle thinking step messages - add them as individual chat messages
      if (parsed.type === 'step-announcement' || 
          parsed.type === 'partial-result' || 
          parsed.type === 'tool-announcement') {
        
        const thinkingMessage: ConversationMessage = {
          id: parsed.id || `thinking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: parsed.content,
          timestamp: new Date(parsed.timestamp || Date.now()),
          messageType: parsed.type,
          toolName: parsed.toolName,
          toolAction: parsed.toolAction
        };
        
        addMessage(thinkingMessage);
        console.log('Added thinking message:', thinkingMessage);
        
        // Also update working status for live feedback
        if (parsed.type === 'step-announcement') {
          setWorkingStatus(parsed.content);
        }
        
        return { type: 'thinking-message', data: thinkingMessage };
      }
      
      // Handle tool announcements
      if (parsed.type === 'tool-announcement') {
        console.log('Tool announced:', parsed.toolName);
        const toolId = startTool(
          parsed.toolName || 'unknown',
          getToolDisplayName(parsed.toolName || 'unknown'),
          {}
        );
        setCurrentTool(parsed.toolName);
        return { type: 'tool-start', toolId, toolName: parsed.toolName };
      }
      
      // Handle progress updates
      if (parsed.progress !== undefined) {
        console.log('Progress update:', parsed.progress);
        const activeTool = tools.find(t => t.status === 'executing');
        if (activeTool) {
          updateToolProgress(activeTool.id, parsed.progress);
        }
        return { type: 'progress', progress: parsed.progress };
      }
      
      // Handle final results
      if (parsed.type === 'final-result') {
        console.log('Final result received:', parsed);
        return { type: 'final-result', data: parsed };
      }
      
      return parsed;
    } catch (parseError) {
      console.warn('Failed to parse streaming chunk:', line);
      return null;
    }
  };

  const getToolDisplayName = (toolName: string) => {
    const displayNames: Record<string, string> = {
      'web-search': 'Web Search',
      'execute_web-search': 'Web Search',
      'knowledge-search': 'Knowledge Search',
      'execute_knowledge-search': 'Knowledge Search',
      'github-tools': 'GitHub Analysis',
      'execute_github-tools': 'GitHub Analysis',
      'web-scraper': 'Web Scraper',
      'execute_web-scraper': 'Web Scraper',
      'jira-tools': 'Jira Tools',
      'execute_jira-tools': 'Jira Tools'
    };
    
    return displayNames[toolName] || toolName.replace('execute_', '').replace(/_/g, ' ');
  };

  const processMessage = async (message: string) => {
    if (!user || !currentSessionId) return;

    const contextualMessage = getContextForMessage(message);
    const enhancedMessage = contextualMessage ? `${message}\n\nContext: ${contextualMessage}` : message;

    setIsLoading(true);
    setIsStreaming(true);
    setWorkingStatus('Analyzing your request...');
    setCurrentTool(undefined);
    clearTools();

    console.log('Starting message processing:', { message, enhancedMessage });

    try {
      const conversationHistory = getConversationHistory();

      // Use streaming for enhanced experience
      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: enhancedMessage,
          conversationHistory,
          userId: user.id,
          sessionId: currentSessionId,
          streaming: true,
          modelSettings: modelSettings
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('AI Agent response received:', data);

      // Handle streaming response
      if (data && typeof data === 'string') {
        const lines = data.split('\n').filter(line => line.trim());
        let finalResult: any = null;
        let currentToolId: string | null = null;

        console.log('Processing streaming lines:', lines.length);

        for (const line of lines) {
          const parsed = parseStreamingChunk(line);
          
          if (parsed) {
            if (parsed.type === 'tool-start') {
              currentToolId = parsed.toolId;
              console.log('Tool started with ID:', currentToolId);
            } else if (parsed.type === 'final-result') {
              finalResult = parsed.data;
              console.log('Final result captured:', finalResult);
              
              // Complete any active tools
              if (currentToolId) {
                completeTool(currentToolId, finalResult.toolsUsed);
                console.log('Tool completed:', currentToolId);
              }
              
              // Mark all executing tools as completed
              tools.forEach(tool => {
                if (tool.status === 'executing') {
                  completeTool(tool.id, finalResult.toolsUsed);
                }
              });
            }
          }
        }

        // Add final assistant message
        if (finalResult && finalResult.success) {
          console.log('Adding final assistant message');
          const assistantMessage: ConversationMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: finalResult.message,
            timestamp: new Date(),
            messageType: 'response',
            toolsUsed: finalResult.toolsUsed || [],
            followUpSuggestions: finalResult.followUpSuggestions || []
          };

          addMessage(assistantMessage);

          if (finalResult.toolsUsed && finalResult.toolsUsed.length > 0) {
            const successCount = finalResult.toolsUsed.filter((tool: any) => tool.success).length;
            if (successCount > 0) {
              toast.success(`Used ${successCount} tool(s) successfully`);
            }
          }
        } else {
          console.warn('No final result found in streaming response');
        }
      } else {
        // Fallback to non-streaming response
        console.log('Using non-streaming fallback');
        if (!data || !data.success) {
          throw new Error(data?.error || 'Failed to get response from AI agent');
        }

        const assistantMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          messageType: 'response',
          toolsUsed: data.toolsUsed || [],
          aiReasoning: data.aiReasoning || undefined,
          followUpSuggestions: data.followUpSuggestions || []
        };

        addMessage(assistantMessage);

        if (data.toolsUsed && data.toolsUsed.length > 0) {
          const successCount = data.toolsUsed.filter((tool: any) => tool.success).length;
          if (successCount > 0) {
            toast.success(`Used ${successCount} tool(s) successfully`);
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark any executing tools as failed
      tools.forEach(tool => {
        if (tool.status === 'executing') {
          failTool(tool.id, error.message);
        }
      });
      
      toast.error('Failed to send message', {
        description: error.message || 'Please try again.',
        duration: 10000
      });

      const errorMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      };

      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setWorkingStatus('Processing your request...');
      setCurrentTool(undefined);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user || !currentSessionId) return;

    // CRITICAL: Add user message IMMEDIATELY before clearing input
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    // Add user message to conversations immediately
    addMessage(userMessage);
    
    // Store the message to process and clear input
    const messageToProcess = input;
    setInput('');
    
    // Process the message (this will add AI responses)
    await processMessage(messageToProcess);
  };

  return (
    <div className="flex h-full">
      {showSessions && (
        <SessionsSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onStartNewSession={startNewSession}
          onLoadSession={loadSession}
          onDeleteSession={deleteSession}
          isLoading={isLoadingSessions}
        />
      )}

      <div className="flex-1 flex flex-col bg-background">
        <SimplifiedChatHeader
          modelSettings={modelSettings}
          showSessions={showSessions}
          onToggleSessions={() => setShowSessions(!showSessions)}
          onNewSession={startNewSession}
          isLoading={isLoading}
        />
        
        <SimplifiedChatInterface
          conversations={conversations}
          isLoading={isLoading}
          modelSettings={modelSettings}
          tools={tools}
          toolsActive={toolsActive}
          scrollAreaRef={scrollAreaRef}
          onFollowUpAction={handleFollowUpAction}
          streamingSteps={[]}
          isStreaming={isStreaming}
          workingStatus={workingStatus}
          currentTool={currentTool}
          toolProgress={undefined}
        />
        
        <SimplifiedChatInput
          input={input}
          onInputChange={setInput}
          onSendMessage={sendMessage}
          isLoading={isLoading}
          modelProvider={modelSettings.provider}
        />
      </div>
    </div>
  );
};

export default AIAgentChat;
