
import React, { useState } from 'react';
import { MCP } from '@/types/mcp';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mcpService } from '@/services/mcpService';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mcpExecution?: any;
}

interface MCPChatInterfaceProps {
  mcps: MCP[];
}

const MCPChatInterface: React.FC<MCPChatInterfaceProps> = ({ mcps }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I can help you use the available MCPs. Just tell me what you need.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const detectMCPIntent = (message: string): { mcp: MCP, parameters: Record<string, any> } | null => {
    // This is a simple placeholder implementation
    // In a real app, you'd use a more sophisticated approach to detect intents and extract parameters
    
    const messageLower = message.toLowerCase();
    
    for (const mcp of mcps) {
      if (messageLower.includes(mcp.title.toLowerCase())) {
        // Very basic parameter extraction - in reality this would be more sophisticated
        const parameters: Record<string, any> = {};
        
        for (const param of mcp.parameters) {
          // Try to find the parameter in the message
          const regex = new RegExp(`${param.name}\\s*[=:]\\s*([\\w\\s]+)`, 'i');
          const match = message.match(regex);
          
          if (match && match[1]) {
            parameters[param.name] = match[1].trim();
          } else if (param.required) {
            // If a required parameter is missing, we can't execute this MCP
            return null;
          }
        }
        
        return { mcp, parameters };
      }
    }
    
    return null;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Check if the message contains an intent to use an MCP
    const mcpIntent = detectMCPIntent(input);
    
    if (mcpIntent) {
      // Add a thinking message
      const thinkingMessage: Message = {
        id: `thinking-${Date.now()}`,
        role: 'system',
        content: `I'm executing the ${mcpIntent.mcp.title} MCP...`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, thinkingMessage]);
      
      // Execute the MCP
      try {
        const result = await mcpService.executeMCP({
          mcpId: mcpIntent.mcp.id,
          parameters: mcpIntent.parameters
        });
        
        let responseContent = "";
        
        if (result && result.status === 'completed') {
          responseContent = `I executed ${mcpIntent.mcp.title} successfully. Here's what I found:\n\n`;
          
          if (result.result && typeof result.result === 'object') {
            if (result.result.content) {
              responseContent += result.result.content;
            } else {
              responseContent += JSON.stringify(result.result, null, 2);
            }
          }
        } else {
          responseContent = `I tried to execute ${mcpIntent.mcp.title}, but there was an error: ${result?.error || 'Unknown error'}`;
        }
        
        // Replace the thinking message with the real response
        setMessages(prev => prev.filter(msg => msg.id !== thinkingMessage.id));
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          mcpExecution: result
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Error executing MCP:', error);
        
        // Replace the thinking message with an error message
        setMessages(prev => prev.filter(msg => msg.id !== thinkingMessage.id));
        
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `I couldn't execute the ${mcpIntent.mcp.title} MCP. There was a technical error.`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } else {
      // Regular response without MCP execution
      setTimeout(() => {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `I understand you want to know about "${input}". To use MCPs, try mentioning one of the available tools: ${mcps.map(m => m.title).join(', ')}.`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }, 1000);
    }
    
    setIsLoading(false);
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role !== 'user' && (
                <Avatar>
                  <AvatarFallback>AI</AvatarFallback>
                  <AvatarImage src="/robot-avatar.png" />
                </Avatar>
              )}
              
              <div 
                className={`rounded-lg px-3 py-2 max-w-[80%] ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : message.role === 'system'
                    ? 'bg-muted text-muted-foreground italic'
                    : 'bg-secondary'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {message.mcpExecution && (
                  <div className="mt-2 text-xs opacity-70">
                    MCP execution completed in {message.mcpExecution.execution_time || '?'}ms
                  </div>
                )}
              </div>
              
              {message.role === 'user' && (
                <Avatar>
                  <AvatarFallback>U</AvatarFallback>
                  <AvatarImage src="/user-avatar.png" />
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <CardFooter className="border-t p-4">
        <div className="flex w-full gap-2">
          <Input
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default MCPChatInterface;
