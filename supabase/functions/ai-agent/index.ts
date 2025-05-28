
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";
import { handleUnifiedQuery } from './unified-query-handler.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body = await req.json();
    const { 
      message, 
      conversationHistory = [], 
      userId, 
      sessionId, 
      streaming = false,
      modelSettings,
      testMode = false,
      atomicMode = false
    } = body;

    // Content validation
    console.log(`[CONTENT_VALIDATION] Validating content for User Message: {
  contentType: "${typeof message}",
  contentLength: ${message?.length || 0},
  isNull: ${message === null},
  isUndefined: ${message === undefined},
  isEmpty: ${!message || !message.trim()}
}`);

    if (!message || typeof message !== 'string' || !message.trim()) {
      console.error('[CONTENT_VALIDATION] Invalid or empty user message provided');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Message content is required and must be a non-empty string' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[CONTENT_VALIDATION] Content validation successful for User Message:', message.length, 'characters');

    // Log the unified request
    console.log(`🤖 AI Agent unified request: {
  message: '${message}',
  historyLength: ${conversationHistory.length},
  userId: "${userId}",
  sessionId: "${sessionId}",
  streaming: ${streaming},
  modelSettings: ${JSON.stringify(modelSettings)},
  testMode: ${testMode},
  atomicMode: ${atomicMode}
}`);

    // Handle the unified query with atomic mode support
    const result = await handleUnifiedQuery(
      message,
      conversationHistory,
      userId,
      sessionId,
      modelSettings,
      streaming,
      supabase,
      atomicMode
    );

    console.log('✅ Unified query completed successfully');
    console.log('📏 Response length:', result.message?.length || 0);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ AI Agent error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        details: 'Check function logs for more information'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
