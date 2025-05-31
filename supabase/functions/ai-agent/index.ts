import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

import { handleUnifiedQuery } from './unified-query-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Enhanced content validation with guaranteed non-null response
 */
function validateAndEnsureContent(content: any, context: string = 'Unknown'): string {
  console.log(`[CONTENT_VALIDATION] Validating content for ${context}:`, {
    contentType: typeof content,
    contentLength: content?.length || 0,
    isNull: content === null,
    isUndefined: content === undefined,
    isEmpty: !content || content.trim?.() === ''
  });

  if (!content) {
    const fallbackMessage = `I apologize, but I encountered an issue generating a response for your request (${context}). Please try again or rephrase your question.`;
    console.error(`[CONTENT_VALIDATION] Content validation failed for ${context}: content is null/undefined, using fallback`);
    return fallbackMessage;
  }

  if (typeof content !== 'string') {
    console.warn(`[CONTENT_VALIDATION] Content validation warning for ${context}: content is not a string, converting`);
    const stringContent = String(content);
    if (!stringContent.trim()) {
      const fallbackMessage = `I processed your request but encountered an issue formatting the response (${context}). Please try again.`;
      console.error(`[CONTENT_VALIDATION] Converted content is empty for ${context}, using fallback`);
      return fallbackMessage;
    }
    return stringContent;
  }

  if (!content.trim()) {
    const fallbackMessage = `I received your request but generated an empty response (${context}). Please try rephrasing your question.`;
    console.error(`[CONTENT_VALIDATION] Content validation failed for ${context}: content is empty string, using fallback`);
    return fallbackMessage;
  }

  console.log(`[CONTENT_VALIDATION] Content validation successful for ${context}: ${content.length} characters`);
  return content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      conversationHistory = [], 
      userId, 
      sessionId, 
      streaming = false, 
      modelSettings, 
      testMode = false, 
      loopEnabled = false,
      agentId, // Agent ID parameter for tool configuration
      customSystemPrompt // Custom system prompt parameter
    } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    // Extract user auth token from Authorization header
    const authHeader = req.headers.get('Authorization');
    const userAuthToken = authHeader?.replace('Bearer ', '');

    console.log('🤖 AI Agent unified request:', { 
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''), 
      historyLength: conversationHistory.length, 
      userId, 
      sessionId,
      streaming,
      modelSettings,
      testMode,
      loopEnabled,
      agentId, // Log the agent ID
      hasCustomPrompt: !!customSystemPrompt,
      hasAuthToken: !!userAuthToken
    });

    // CRITICAL FIX: Do NOT store user message in database here
    // The frontend already handles user message insertion to prevent duplicates
    console.log('🚫 Skipping user message insertion - handled by frontend to prevent duplicates');

    // In test mode, return basic response for validation
    if (testMode) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Test mode: Unified handler would process query "${message}" with agent ${agentId || 'default'}`,
          unifiedApproach: true,
          testMode: true,
          agentId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use unified query handler for all requests with agent ID and user auth token
    const result = await handleUnifiedQuery(
      message,
      conversationHistory,
      userId,
      sessionId,
      modelSettings,
      streaming,
      supabase,
      0, // loopIteration
      loopEnabled, // Pass the loop setting
      customSystemPrompt, // Pass the custom system prompt
      agentId, // Pass the agent ID for tool configuration
      userAuthToken // Pass the user auth token
    );

    // Handle streaming responses
    if (result.streaming) {
      return new Response(JSON.stringify(result.data), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    console.log('✅ Unified query completed successfully for agent:', agentId);
    console.log('📏 Response length:', result.message?.length || 0);
    console.log('🛠️ Tools available:', result.availableToolsCount || 0);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ AI Agent error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
        details: 'Check the edge function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
