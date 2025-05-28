
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
  const toolMessageQueue = useRef<any[]>([]);
  const processingToolQueue = useRef<boolean>(false);

  // Process tool message queue sequentially with minimum display time
  const processToolMessageQueue = React.useCallback(async () => {
    if (processingToolQueue.current || toolMessageQueue.current.length === 0) {
      return;
    }

    processingToolQueue.current = true;
    console.log(`🔧 [TOOL-QUEUE] Processing ${toolMessageQueue.current.length} tool messages`);

    const messagesToProcess = [...toolMessageQueue.current];
    toolMessageQueue.current = [];

    for (const { message, toolData } of messagesToProcess) {
      if (processedToolMessages.current.has(message.id)) {
        console.log(`⚠️ [TOOL-QUEUE] Already processed tool message: ${message.id}`);
        continue;
      }

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
          
          // Ensure minimum display time for executing state
          await new Promise(resolve => setTimeout(resolve, 500));
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
          
          // Allow tool to show executing state briefly
          await new Promise(resolve => setTimeout(resolve, 300));
          completeTool(newToolId, toolData.result);
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
          
          // Allow tool to show executing state briefly
          await new Promise(resolve => setTimeout(resolve, 300));
          failTool(newToolId, toolData.error);
        } else {
          console.log(`❌ [TOOL-MANAGER] Failing existing tool: ${toolData.toolName}`);
          failTool(existingTool.id, toolData.error);
        }
      }

      // Small delay between processing messages
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    processingToolQueue.current = false;
    console.log(`✅ [TOOL-QUEUE] Finished processing tool message queue`);
  }, [tools, startTool, completeTool, failTool]);

  // Process tool execution messages from the backend and real-time updates
  useEffect(() => {
    // Look for tool-executing messages in the entire message history
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
        console.log(`🔍 [TOOL-MANAGER] Queueing tool data:`, toolData);
        
        // Add to queue for sequential processing with timing control
        toolMessageQueue.current.push({ message, toolData });
        processToolMessageQueue();
      } catch (e) {
        console.warn(`❌ [TOOL-MANAGER] Failed to parse tool execution message:`, e, message.content);
      }
    });
  }, [messages, processToolMessageQueue]);

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
      toolMessageQueue.current = [];
    }
  }, [messages, clearTools]);

  return null; // This is a logic-only component
};

export default ToolProgressManager;
