
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
const npawApiKey = Deno.env.get('NPAW_API_KEY');

// Ensure URL has the v1 prefix for API endpoints
function ensureApiPrefix(url: string): string {
  // Remove trailing slash if present
  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  
  // Check if URL already ends with /v1
  if (baseUrl.endsWith('/v1')) {
    return baseUrl;
  }
  
  // Otherwise append /v1
  return `${baseUrl}/v1`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const requestData = await req.json();
    
    // Check if this is a settings operation
    if (requestData.operation === 'getSettings') {
      console.log('Handling getSettings operation');
      return new Response(
        JSON.stringify({
          localModelUrl: localModelUrl || null,
          isUsingLocalModel: !!localModelUrl,
          hasNpawKey: !!npawApiKey
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if this is a request to get available models
    if (requestData.operation === 'getAvailableModels') {
      console.log('Handling getAvailableModels operation');
      
      const provider = requestData.provider || 'openai';
      
      if (provider === 'npaw') {
        // Return NPAW models
        return new Response(
          JSON.stringify({ 
            models: [
              { id: 'DeepSeek-V3', name: 'DeepSeek-V3', provider: 'npaw' }
            ] 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (provider === 'local') {
        // Get the local model URL either from the request or environment variable
        const modelUrl = requestData.localUrl || localModelUrl;
        
        // If no local model URL is set, return empty list
        if (!modelUrl) {
          return new Response(
            JSON.stringify({ models: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        try {
          // Format the URL properly with the v1 prefix for models endpoint
          const baseApiUrl = ensureApiPrefix(modelUrl);
          const modelsEndpoint = `${baseApiUrl}/models`;
          
          console.log(`Fetching models from: ${modelsEndpoint}`);
          
          // Call the LM Studio models endpoint
          const modelsResponse = await fetch(modelsEndpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!modelsResponse.ok) {
            throw new Error(`Error fetching models: ${modelsResponse.status}`);
          }
          
          const modelsData = await modelsResponse.json();
          console.log(`Models response:`, JSON.stringify(modelsData).substring(0, 200) + '...');
          
          return new Response(
            JSON.stringify({ models: modelsData.data || [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error("Error fetching models:", error);
          return new Response(
            JSON.stringify({ error: `Could not fetch models: ${error.message}`, models: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // Default to OpenAI models
      return new Response(
        JSON.stringify({ 
          models: [
            { id: 'gpt-4o', name: 'GPT-4O', provider: 'openai' },
            { id: 'gpt-4o-mini', name: 'GPT-4O Mini', provider: 'openai' }
          ] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Determine which provider to use based on request
    const provider = requestData.provider || 'openai';
    console.log(`Processing AI request using ${provider} provider`);
    
    let apiUrl;
    let authHeader;
    let requestBody;
    
    if (provider === 'npaw') {
      // NPAW DeepSeek API
      apiUrl = 'https://ai2.npaw.com:5500/generate';
      authHeader = { 'npaw-api-key': npawApiKey };
      requestBody = {
        model: requestData.model || 'DeepSeek-V3',
        messages: requestData.messages,
        temperature: requestData.temperature || 0.7,
        max_completion_tokens: requestData.max_tokens || 1000,
        top_p: requestData.top_p || 1.0,
        tool_choice: requestData.tool_choice || 'auto',
        response_format: requestData.response_format || 'auto'
      };
    } else if (provider === 'local' && localModelUrl) {
      // Local model API
      const baseApiUrl = ensureApiPrefix(localModelUrl);
      apiUrl = `${baseApiUrl}/chat/completions`;
      authHeader = {}; // Local LM Studio doesn't require auth
      requestBody = {
        model: requestData.model || 'default',
        messages: requestData.messages,
        temperature: requestData.temperature || 0.7,
        max_tokens: requestData.max_tokens || 1000
      };
    } else {
      // OpenAI API (default)
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      authHeader = { 'Authorization': `Bearer ${openaiApiKey}` };
      requestBody = {
        model: requestData.model || 'gpt-4o-mini',
        messages: requestData.messages,
        temperature: requestData.temperature || 0.7,
        max_tokens: requestData.max_tokens || 1000
      };
    }
      
    console.log(`Calling ${provider} API at: ${apiUrl}`);
    
    // Make the API call
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Check for API errors
    if (!response.ok) {
      let errorBody = {};
      try {
        errorBody = await response.json();
      } catch (e) {
        // Ignore if we can't parse as JSON
      }
      console.error(`${provider} API error:`, response.status, errorBody);
      return new Response(
        JSON.stringify({ 
          error: `${provider} API error: ${response.status}`,
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
