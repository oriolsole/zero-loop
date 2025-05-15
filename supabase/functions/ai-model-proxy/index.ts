
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Configure CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get API keys from environment variables
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const localModelUrl = Deno.env.get('LOCAL_MODEL_URL');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const requestData = await req.json();
    
    console.log(`Processing AI request, using ${localModelUrl ? 'local model' : 'OpenAI'}`);
    
    // Determine which API to use (local model or OpenAI)
    const apiUrl = localModelUrl 
      ? `${localModelUrl}/chat/completions` 
      : 'https://api.openai.com/v1/chat/completions';
    
    // Set up authorization header based on which API we're using
    const authHeader = localModelUrl
      ? {} // Local LM Studio doesn't require auth
      : { 'Authorization': `Bearer ${openaiApiKey}` };
      
    console.log(`Calling API at: ${apiUrl}`);
    
    // Make the API call
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: requestData.model || 'gpt-4o', // Use specified model or default
        messages: requestData.messages,
        temperature: requestData.temperature || 0.7,
        max_tokens: requestData.max_tokens || 1000
      })
    });

    // Check for API errors
    if (!response.ok) {
      let errorBody = {};
      try {
        errorBody = await response.json();
      } catch (e) {
        // Ignore if we can't parse as JSON
      }
      console.error("API error:", response.status, errorBody);
      return new Response(
        JSON.stringify({ 
          error: `API error: ${response.status}`,
          details: errorBody
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and return the response
    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
