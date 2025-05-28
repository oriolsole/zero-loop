
import React, { useEffect } from 'react';
import { useToolProgress } from '@/hooks/useToolProgress';
import { useConversationContext } from '@/contexts/ConversationContext';

interface ToolProgressManagerProps {
  onToolsUpdate: (tools: any[], isActive: boolean) => void;
}

export const ToolProgressManager: React.FC<ToolProgressManagerProps> = ({ onToolsUpdate }) => {
  const {
    tools,
    isActive,
    startTool,
    updateTool,
    completeTool,
    failTool,
    clearTools
  } = useToolProgress();

  const { messages } = useConversationContext();

  // Process tool execution messages from the backend
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    
    if (latestMessage?.messageType === 'tool-executing' && latestMessage.content.startsWith('{')) {
      try {
        const toolData = JSON.parse(latestMessage.content);
        
        if (toolData.status === 'executing') {
          // Start or update tool execution
          const existingTool = tools.find(t => t.name === toolData.toolName);
          
          if (!existingTool) {
            console.log(`🔧 [TOOL] Starting tool: ${toolData.toolName}`);
            startTool(
              toolData.toolName,
              toolData.displayName || toolData.toolName,
              toolData.parameters
            );
          }
        } else if (toolData.status === 'completed') {
          // Complete the tool
          const existingTool = tools.find(t => t.name === toolData.toolName);
          if (existingTool) {
            console.log(`✅ [TOOL] Completing tool: ${toolData.toolName}`);
            completeTool(existingTool.id, toolData.result);
          }
        } else if (toolData.status === 'failed') {
          // Fail the tool
          const existingTool = tools.find(t => t.name === toolData.toolName);
          if (existingTool) {
            console.log(`❌ [TOOL] Failing tool: ${toolData.toolName}`);
            failTool(existingTool.id, toolData.error);
          }
        }
      } catch (e) {
        console.warn('Failed to parse tool execution message:', e);
      }
    }
  }, [messages, tools, startTool, updateTool, completeTool, failTool]);

  // Notify parent of tool updates
  useEffect(() => {
    onToolsUpdate(tools, isActive);
  }, [tools, isActive, onToolsUpdate]);

  // Clear tools when starting a new conversation
  useEffect(() => {
    const hasUserMessage = messages.some(m => m.role === 'user');
    if (!hasUserMessage) {
      clearTools();
    }
  }, [messages, clearTools]);

  return null; // This is a logic-only component
};

export default ToolProgressManager;
