
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

  // Process tool execution messages from the backend and real-time updates
  useEffect(() => {
    // Look for tool-executing messages in the entire message history
    const toolExecutingMessages = messages.filter(msg => msg.messageType === 'tool-executing');
    
    console.log(`🔧 [TOOL-MANAGER] Found ${toolExecutingMessages.length} tool execution messages`);
    
    toolExecutingMessages.forEach(message => {
      if (!message.content.startsWith('{')) {
        console.log(`⚠️ [TOOL-MANAGER] Tool message doesn't start with JSON: ${message.content}`);
        return;
      }
      
      try {
        const toolData = JSON.parse(message.content);
        console.log(`🔍 [TOOL-MANAGER] Parsing tool data:`, toolData);
        
        if (toolData.status === 'executing') {
          // Start or update tool execution
          const existingTool = tools.find(t => t.name === toolData.toolName);
          
          if (!existingTool) {
            console.log(`🔧 [TOOL-MANAGER] Starting tool: ${toolData.toolName}`);
            startTool(
              toolData.toolName,
              toolData.displayName || toolData.toolName,
              toolData.parameters
            );
          } else {
            console.log(`🔄 [TOOL-MANAGER] Tool already exists: ${toolData.toolName}`);
          }
        } else if (toolData.status === 'completed') {
          // Complete the tool
          let existingTool = tools.find(t => t.name === toolData.toolName);
          
          if (!existingTool) {
            // If tool wasn't tracked during execution, create it now
            console.log(`🔧 [TOOL-MANAGER] Creating and completing tool: ${toolData.toolName}`);
            const newToolId = startTool(
              toolData.toolName,
              toolData.displayName || toolData.toolName,
              toolData.parameters
            );
            // Complete immediately
            setTimeout(() => completeTool(newToolId, toolData.result), 50);
          } else {
            console.log(`✅ [TOOL-MANAGER] Completing existing tool: ${toolData.toolName}`, toolData.result);
            completeTool(existingTool.id, toolData.result);
          }
        } else if (toolData.status === 'failed') {
          // Fail the tool
          let existingTool = tools.find(t => t.name === toolData.toolName);
          
          if (!existingTool) {
            // If tool wasn't tracked during execution, create it now
            console.log(`🔧 [TOOL-MANAGER] Creating and failing tool: ${toolData.toolName}`);
            const newToolId = startTool(
              toolData.toolName,
              toolData.displayName || toolData.toolName,
              toolData.parameters
            );
            // Fail immediately
            setTimeout(() => failTool(newToolId, toolData.error), 50);
          } else {
            console.log(`❌ [TOOL-MANAGER] Failing existing tool: ${toolData.toolName}`);
            failTool(existingTool.id, toolData.error);
          }
        }
      } catch (e) {
        console.warn(`❌ [TOOL-MANAGER] Failed to parse tool execution message:`, e, message.content);
      }
    });
  }, [messages, tools, startTool, updateTool, completeTool, failTool]);

  // Notify parent of tool updates
  useEffect(() => {
    console.log(`🔧 [TOOL-MANAGER] Updating parent with ${tools.length} tools, active: ${isActive}`);
    onToolsUpdate(tools, isActive);
  }, [tools, isActive, onToolsUpdate]);

  // Clear tools when starting a new conversation
  useEffect(() => {
    const hasUserMessage = messages.some(m => m.role === 'user');
    if (!hasUserMessage) {
      console.log(`🧹 [TOOL-MANAGER] Clearing tools - no user messages`);
      clearTools();
    }
  }, [messages, clearTools]);

  return null; // This is a logic-only component
};

export default ToolProgressManager;
