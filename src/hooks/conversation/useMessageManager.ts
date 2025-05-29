
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationMessage } from '@/hooks/useAgentConversation';
import { v4 as uuidv4 } from 'uuid';

export const useMessageManager = () => {
  const { user } = useAuth();

  // Generate deterministic message ID with Unicode-safe encoding
  const generateMessageId = useCallback((content: string, role: string, sessionId: string): string => {
    const timestamp = Date.now();
    // Use a simple hash instead of btoa to avoid Unicode issues
    const hashInput = `${content.substring(0, 50)}-${role}-${sessionId}-${timestamp}`;
    const hash = Math.abs(hashInput.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)).toString(36).substring(0, 8);
    return `${role}-${timestamp}-${hash}`;
  }, []);

  // Helper to safely convert toolsUsed from database JSON to TypeScript interface
  const safeToolsUsed = useCallback((toolsUsed: any): ConversationMessage['toolsUsed'] => {
    if (!toolsUsed) return undefined;
    
    try {
      let parsedTools;
      if (typeof toolsUsed === 'string') {
        parsedTools = JSON.parse(toolsUsed);
      } else if (Array.isArray(toolsUsed)) {
        parsedTools = toolsUsed;
      } else {
        return undefined;
      }
      
      if (Array.isArray(parsedTools)) {
        return parsedTools.map((tool: any) => ({
          name: tool.name || 'Unknown Tool',
          success: Boolean(tool.success),
          result: tool.result,
          error: tool.error
        }));
      }
    } catch (e) {
      console.warn('Failed to parse toolsUsed:', e);
    }
    
    return undefined;
  }, []);

  // Helper to safely convert messageType
  const safeMessageType = useCallback((messageType: any): ConversationMessage['messageType'] => {
    const validTypes = [
      'analysis', 'planning', 'execution', 'tool-update', 'response', 
      'step-executing', 'step-completed', 'loop-start', 'loop-reflection', 
      'loop-enhancement', 'loop-complete', 'tool-executing'
    ];
    return validTypes.includes(messageType) ? messageType : undefined;
  }, []);

  // Helper to safely convert toolDecision from database JSON to TypeScript interface
  const safeToolDecision = useCallback((toolDecision: any): ConversationMessage['toolDecision'] => {
    if (!toolDecision) return undefined;
    
    try {
      let parsedDecision;
      if (typeof toolDecision === 'string') {
        parsedDecision = JSON.parse(toolDecision);
      } else if (typeof toolDecision === 'object' && toolDecision !== null) {
        parsedDecision = toolDecision;
      } else {
        return undefined;
      }
      
      // Validate the structure matches expected interface
      if (parsedDecision && 
          typeof parsedDecision.reasoning === 'string' && 
          Array.isArray(parsedDecision.selectedTools)) {
        return {
          reasoning: parsedDecision.reasoning,
          selectedTools: parsedDecision.selectedTools
        };
      }
    } catch (e) {
      console.warn('Failed to parse toolDecision:', e);
    }
    
    return undefined;
  }, []);

  // Database-only persistence with conflict resolution
  const persistMessageToDatabase = useCallback(async (
    message: ConversationMessage,
    sessionId: string
  ): Promise<boolean> => {
    if (!user || !sessionId) {
      console.error('❌ No user or session for persistence');
      return false;
    }

    try {
      console.log(`💾 Persisting message to database: ${message.id}`);

      // Check if message already exists first
      const { data: existing } = await supabase
        .from('agent_conversations')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .eq('role', message.role)
        .eq('content', message.content)
        .maybeSingle();

      if (existing) {
        console.log(`⚠️ Message already exists in database: ${existing.id}`);
        return true; // Consider this success since message exists
      }

      const { error } = await supabase
        .from('agent_conversations')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          role: message.role,
          content: message.content,
          message_type: message.messageType || null,
          tools_used: message.toolsUsed || null,
          self_reflection: message.selfReflection || null,
          tool_decision: message.toolDecision || null,
          ai_reasoning: message.aiReasoning || null,
          loop_iteration: message.loopIteration || 0,
          improvement_reasoning: message.improvementReasoning || null,
          should_continue_loop: message.shouldContinueLoop || null,
          created_at: message.timestamp.toISOString()
        });

      if (error) {
        // Handle duplicate key constraint gracefully
        if (error.code === '23505' && error.message.includes('idx_unique_message_per_session_no_type')) {
          console.log('💡 Duplicate message prevented by constraint - this is expected');
          return true;
        }
        console.error('❌ Error persisting message:', error);
        return false;
      }

      console.log(`✅ Message persisted successfully: ${message.id}`);
      return true;
    } catch (error) {
      console.error('❌ Exception persisting message:', error);
      return false;
    }
  }, [user]);

  // Enhanced load conversation that fetches both new and updated messages
  const loadConversationFromDatabase = useCallback(async (
    sessionId: string, 
    afterTimestamp?: Date
  ): Promise<ConversationMessage[]> => {
    if (!user) return [];

    try {
      console.log(`📂 Loading conversation from database: ${sessionId}${afterTimestamp ? ` after ${afterTimestamp.toISOString()}` : ''}`);
      
      let query = supabase
        .from('agent_conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      // Enhanced timestamp filtering: fetch messages that are either created OR updated after the timestamp
      if (afterTimestamp) {
        const timestampString = afterTimestamp.toISOString();
        query = query.or(`created_at.gt.${timestampString},updated_at.gt.${timestampString}`);
        console.log(`🔍 Fetching messages created OR updated after: ${timestampString}`);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      const messages: ConversationMessage[] = (data || []).map(row => ({
        id: row.id.toString(),
        role: row.role as ConversationMessage['role'],
        content: row.content,
        timestamp: new Date(row.created_at),
        messageType: safeMessageType(row.message_type),
        toolsUsed: safeToolsUsed(row.tools_used),
        selfReflection: row.self_reflection || undefined,
        toolDecision: safeToolDecision(row.tool_decision),
        aiReasoning: row.ai_reasoning || undefined,
        loopIteration: row.loop_iteration || 0,
        improvementReasoning: row.improvement_reasoning || undefined,
        shouldContinueLoop: row.should_continue_loop || undefined
      }));

      console.log(`✅ Loaded ${messages.length} messages from database${afterTimestamp ? ' (new or updated messages)' : ''}`);
      return messages;
    } catch (error) {
      console.error(`❌ Error loading conversation:`, error);
      return [];
    }
  }, [user, safeMessageType, safeToolsUsed, safeToolDecision]);

  return {
    generateMessageId,
    persistMessageToDatabase,
    loadConversationFromDatabase
  };
};
