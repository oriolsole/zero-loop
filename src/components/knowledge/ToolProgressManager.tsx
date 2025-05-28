
import React, { useEffect, useRef } from 'react';
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
  
  // Track processed tool messages to prevent duplicates
  const processedToolMessages = useRef<Set<string>>(new Set());

  // SIMPLIFIED: Process tool execution messages immediately
  useEffect(() => {
    // Find all tool-executing messages
    const toolExecutingMessages = messages.filter(msg => msg.messageType === 'tool-executing');
    
    console.log(`🔧 [TOOL-MANAGER] Found ${toolExecutingMessages.length} tool execution messages`);
    
    toolExecutingMessages.forEach(message => {
      // Skip if already processed
      if (processedToolMessages.current.has(message.id)) {
        return;
      }

      if (!message.content.startsWith('{')) {
        console.log(`⚠️ [TOOL-MANAGER] Tool message doesn't start with JSON: ${message.content}`);
        return;
      }
      
      try {
        const toolData = JSON.parse(message.content);
        console.log(`🔍 [TOOL-MANAGER] Processing tool data:`, toolData);
        
        processedToolMessages.current.add(message.id);
        
        if (toolData.status === 'executing') {
          const existingTool = tools.find(t => t.name === toolData.toolName);
          
          if (!existingTool) {
            console.log(`🔧 [TOOL-MANAGER] Starting tool: ${toolData.toolName}`);
            const toolId = startTool(
              toolData.toolName,
              toolData.displayName || toolData.toolName,
              toolData.parameters
            );
          }
        } else if (toolData.status === 'completed') {
          let existingTool = tools.find(t => t.name === toolData.toolName);
          
          if (!existingTool) {
            console.log(`🔧 [TOOL-MANAGER] Creating and completing tool: ${toolData.toolName}`);
            const newToolId = startTool(
              toolData.toolName,
              toolData.displayName || toolData.toolName,
              toolData.parameters
            );
            
            // Complete the tool after a brief moment
            setTimeout(() => {
              completeTool(newToolId, toolData.result);
            }, 500);
          } else {
            console.log(`✅ [TOOL-MANAGER] Completing existing tool: ${toolData.toolName}`);
            completeTool(existingTool.id, toolData.result);
          }
        } else if (toolData.status === 'failed') {
          let existingTool = tools.find(t => t.name === toolData.toolName);
          
          if (!existingTool) {
            console.log(`🔧 [TOOL-MANAGER] Creating and failing tool: ${toolData.toolName}`);
            const newToolId = startTool(
              toolData.toolName,
              toolData.displayName || toolData.toolName,
              toolData.parameters
            );
            
            // Fail the tool after a brief moment
            setTimeout(() => {
              failTool(newToolId, toolData.error);
            }, 500);
          } else {
            console.log(`❌ [TOOL-MANAGER] Failing existing tool: ${toolData.toolName}`);
            failTool(existingTool.id, toolData.error);
          }
        }
      } catch (e) {
        console.warn(`❌ [TOOL-MANAGER] Failed to parse tool execution message:`, e, message.content);
      }
    });
  }, [messages, tools, startTool, completeTool, failTool]);

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
      processedToolMessages.current.clear();
    }
  }, [messages, clearTools]);

  return null; // This is a logic-only component
};

export default ToolProgressManager;
