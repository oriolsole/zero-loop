
import { executeTools } from './tool-executor.ts';
import { MessageManager } from './message-manager.ts';

/**
 * Tool execution coordination and message management
 */
export class ToolExecutionManager {
  private messageManager: MessageManager;
  private mcps: any[];

  constructor(messageManager: MessageManager, mcps: any[]) {
    this.messageManager = messageManager;
    this.mcps = mcps;
  }

  /**
   * Execute tools and manage their message lifecycle
   */
  async executeToolsWithMessageManagement(
    toolCalls: any[],
    userId: string | null,
    supabase: any,
    loopIteration: number
  ): Promise<{ toolResults: any[], toolsUsed: any[], toolCallMessageMap: Map<string, string> }> {
    const toolCallMessageMap = new Map<string, string>();
    
    console.log(`🛠️ LLM chose to use ${toolCalls.length} tools (loop ${loopIteration})`);
    
    // Create or find tool execution messages - ONE per unique tool call
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name.replace('execute_', '');
      const mcpInfo = this.mcps?.find(m => m.default_key === toolName);
      
      let parameters;
      try {
        parameters = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        parameters = {};
      }
      
      // Check if message already exists for this tool call
      const existingMessageId = await this.messageManager.toolMessageExistsByCallId(toolCall.id, loopIteration);
      
      if (existingMessageId) {
        // Use existing message
        toolCallMessageMap.set(toolCall.id, existingMessageId);
        console.log(`♻️ Reusing existing tool message ${existingMessageId} for call ${toolCall.id}`);
      } else {
        // Create new tool execution message
        const toolExecutionData = {
          toolName: toolName,
          displayName: mcpInfo?.title || toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          status: 'executing',
          parameters: parameters,
          startTime: new Date().toISOString(),
          toolCallId: toolCall.id
        };
        
        console.log(`🚀 Creating tool execution message for ${toolName} (call: ${toolCall.id})`);
        const messageId = await this.messageManager.insertMessage(
          JSON.stringify(toolExecutionData),
          'tool-executing'
        );
        
        if (messageId) {
          toolCallMessageMap.set(toolCall.id, messageId);
          console.log(`📝 Mapped tool call ${toolCall.id} to message ${messageId}`);
        } else {
          console.error(`❌ Failed to create message for tool ${toolName}`);
        }
      }
    }
    
    const { toolResults, toolsUsed } = await executeTools(
      toolCalls,
      this.mcps,
      userId,
      supabase
    );
    
    // Update existing tool messages with completion data
    await this.updateToolMessages(toolCalls, toolsUsed, toolCallMessageMap);
    
    return { toolResults, toolsUsed, toolCallMessageMap };
  }

  /**
   * Update tool messages with completion status
   */
  private async updateToolMessages(
    toolCalls: any[],
    toolsUsed: any[],
    toolCallMessageMap: Map<string, string>
  ): Promise<void> {
    for (const toolCall of toolCalls) {
      const messageId = toolCallMessageMap.get(toolCall.id);
      if (!messageId) {
        console.error(`❌ No message ID found for tool call ${toolCall.id}`);
        continue;
      }
      
      const toolName = toolCall.function.name.replace('execute_', '');
      const mcpInfo = this.mcps?.find(m => m.default_key === toolName);
      const tool = toolsUsed.find(t => t.name === toolCall.function.name);
      
      if (tool) {
        const toolCompletionData = {
          toolName: toolName,
          displayName: mcpInfo?.title || toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          status: tool.success ? 'completed' : 'failed',
          parameters: tool.parameters || {},
          result: tool.result,
          error: tool.success ? undefined : (tool.error || 'Tool execution failed'),
          success: tool.success,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          toolCallId: toolCall.id
        };
        
        console.log(`🔄 Updating tool message ${messageId} from executing to ${tool.success ? 'completed' : 'failed'}`);
        
        const updateSuccess = await this.messageManager.updateMessage(messageId, JSON.stringify(toolCompletionData));
        
        if (!updateSuccess) {
          console.error(`❌ Failed to update tool message ${messageId} for ${toolName}`);
        } else {
          console.log(`✅ Successfully updated tool message ${messageId} for ${toolName}`);
        }
      } else {
        console.error(`❌ No tool result found for ${toolCall.function.name}`);
      }
    }
  }
}
