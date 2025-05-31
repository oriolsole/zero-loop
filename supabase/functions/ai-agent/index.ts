
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

serve(async (req) => {
  console.log('🤖 AI Agent request received');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      console.error('❌ Invalid request method:', req.method);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Method not allowed. Use POST.' 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the raw request body first
    let rawBody: string;
    try {
      rawBody = await req.text();
      console.log('📥 Raw request body length:', rawBody.length);
      
      if (!rawBody || rawBody.trim() === '') {
        console.error('❌ Empty request body');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Request body is empty' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } catch (error) {
      console.error('❌ Failed to read request body:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to read request body' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse JSON with error handling
    let requestData: any;
    try {
      requestData = JSON.parse(rawBody);
      console.log('✅ Successfully parsed JSON request');
      console.log('📋 Request keys:', Object.keys(requestData || {}));
    } catch (error) {
      console.error('❌ JSON parsing failed:', error);
      console.error('❌ Raw body that failed to parse:', rawBody.substring(0, 200));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate required fields
    const { message, userId, sessionId, modelSettings, streaming = false, loopEnabled = false, agentId, customSystemPrompt } = requestData;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      console.error('❌ Missing or invalid message');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Message is required and must be a non-empty string' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!userId || typeof userId !== 'string') {
      console.error('❌ Missing or invalid userId');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'userId is required and must be a string' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      console.error('❌ Missing or invalid sessionId');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'sessionId is required and must be a string' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🎯 Processing message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    console.log(`👤 User: ${userId}`);
    console.log(`📱 Session: ${sessionId}`);
    console.log(`🤖 Agent: ${agentId || 'default'}`);
    console.log(`🔄 Loop enabled: ${loopEnabled}`);

    // Get conversation history
    const { data: conversationHistory, error: historyError } = await supabase
      .from('agent_conversations')
      .select('role, content, message_type, created_at')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      console.error('❌ Failed to fetch conversation history:', historyError);
    }

    const history = conversationHistory || [];
    console.log(`📚 Loaded ${history.length} messages from conversation history`);

    // Add user message to conversation history immediately
    const userMessageData = {
      user_id: userId,
      session_id: sessionId,
      role: 'user',
      content: message.trim(),
      message_type: 'request',
      loop_iteration: 0,
      agent_id: agentId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('💾 Storing user message in database');
    const { error: insertError } = await supabase
      .from('agent_conversations')
      .insert(userMessageData);

    if (insertError) {
      console.error('❌ Failed to store user message:', insertError);
      // Continue processing even if storage fails
    } else {
      console.log('✅ User message stored successfully');
    }

    // Process the query using unified handler
    const result = await handleUnifiedQuery(
      message.trim(),
      history,
      userId,
      sessionId,
      modelSettings,
      streaming,
      supabase,
      0, // loopIteration
      loopEnabled,
      customSystemPrompt,
      agentId
    );

    console.log('🎉 AI Agent processing completed successfully');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ AI Agent error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `Internal server error: ${error.message}`,
        details: error.stack ? error.stack.substring(0, 500) : 'No stack trace available'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
