
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 AI Agent function called');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('❌ OPENAI_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { message, conversationHistory, userId, sessionId, streaming, modelSettings } = await req.json();
    
    console.log('📝 Request data:', { 
      messageLength: message?.length, 
      historyLength: conversationHistory?.length,
      userId,
      sessionId,
      streaming,
      modelProvider: modelSettings?.provider
    });

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Provide clear, accurate, and useful responses to user questions.'
      },
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    console.log('🤖 Calling OpenAI with', messages.length, 'messages');

    if (streaming) {
      // Streaming response
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelSettings?.selectedModel || 'gpt-4o-mini',
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2000
        }),
      });

      if (!openAIResponse.ok) {
        const errorData = await openAIResponse.text();
        console.error('❌ OpenAI API error:', errorData);
        return new Response(
          JSON.stringify({ error: 'OpenAI API error', details: errorData }),
          { 
            status: openAIResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Create a streaming response
      const stream = new ReadableStream({
        async start(controller) {
          const reader = openAIResponse.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let fullResponse = '';

          try {
            // Send initial step
            controller.enqueue(new TextEncoder().encode(
              JSON.stringify({ type: 'step-announcement', content: 'Processing your request...' }) + '\n'
            ));

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      fullResponse += content;
                    }
                  } catch (e) {
                    // Skip invalid JSON
                  }
                }
              }
            }

            // Send final result
            controller.enqueue(new TextEncoder().encode(
              JSON.stringify({ 
                type: 'final-result', 
                message: fullResponse,
                toolsUsed: []
              }) + '\n'
            ));

          } catch (error) {
            console.error('❌ Streaming error:', error);
            controller.enqueue(new TextEncoder().encode(
              JSON.stringify({ type: 'error', error: error.message }) + '\n'
            ));
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });

    } else {
      // Non-streaming response
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelSettings?.selectedModel || 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 2000
        }),
      });

      if (!openAIResponse.ok) {
        const errorData = await openAIResponse.text();
        console.error('❌ OpenAI API error:', errorData);
        return new Response(
          JSON.stringify({ error: 'OpenAI API error', details: errorData }),
          { 
            status: openAIResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const data = await openAIResponse.json();
      const assistantMessage = data.choices[0]?.message?.content;

      console.log('✅ OpenAI response received, length:', assistantMessage?.length);

      return new Response(
        JSON.stringify({ 
          message: assistantMessage,
          toolsUsed: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('❌ Error in ai-agent function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
