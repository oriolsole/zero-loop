
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

/**
 * Validate and sanitize messages to prevent null content errors
 */
function validateAndSanitizeMessages(messages: any[]): any[] {
  if (!Array.isArray(messages)) {
    console.warn('Messages is not an array, returning empty array');
    return [];
  }

  return messages
    .filter(message => {
      // Remove messages with completely invalid structure
      if (!message || typeof message !== 'object') {
        console.warn('Removing invalid message object:', message);
        return false;
      }
      
      // Ensure role is valid
      if (!message.role || typeof message.role !== 'string') {
        console.warn('Removing message with invalid role:', message);
        return false;
      }

      return true;
    })
    .map(message => {
      // Sanitize content
      let content = message.content;
      
      if (content === null || content === undefined) {
        console.warn(`Message with role "${message.role}" has null/undefined content, replacing with placeholder`);
        content = `[Content unavailable for ${message.role} message]`;
      } else if (typeof content !== 'string') {
        console.warn(`Message with role "${message.role}" has non-string content, converting to string`);
        content = String(content);
      }
      
      // Ensure content is not empty
      if (!content.trim()) {
        content = `[Empty ${message.role} message]`;
      }

      return {
        ...message,
        content: content
      };
    });
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
        // Return both NPAW models
        return new Response(
          JSON.stringify({ 
            models: [
              { id: 'DeepSeek-V3', name: 'DeepSeek-V3', provider: 'npaw' },
              { id: 'Mistral7B', name: 'Mistral7B', provider: 'npaw' }
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
      
      // Default to OpenAI models including o1 models
      return new Response(
        JSON.stringify({ 
          models: [
            { id: 'gpt-4o', name: 'GPT-4O', provider: 'openai' },
            { id: 'gpt-4o-mini', name: 'GPT-4O Mini', provider: 'openai' },
            { id: 'o1-mini', name: 'O1 Mini', provider: 'openai' },
            { id: 'o1-preview', name: 'O1 Preview', provider: 'openai' }
          ] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate and sanitize messages before processing
    if (requestData.messages) {
      const originalMessageCount = requestData.messages.length;
      requestData.messages = validateAndSanitizeMessages(requestData.messages);
      const sanitizedMessageCount = requestData.messages.length;
      
      if (originalMessageCount !== sanitizedMessageCount) {
        console.log(`Message validation: ${originalMessageCount} -> ${sanitizedMessageCount} messages`);
      }
    }
    
    // Determine which provider to use based on request
    const provider = requestData.provider || 'openai';
    console.log(`Processing AI request using ${provider} provider`);
    
    let apiUrl;
    let authHeader;
    let requestBody;
    
    if (provider === 'npaw') {
      console.log('NPAW API Key configured:', !!npawApiKey);
      console.log('NPAW Model requested:', requestData.model);
      
      if (!npawApiKey) {
        console.error('NPAW API key not configured');
        return new Response(
          JSON.stringify({ error: 'NPAW API key not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Try HTTPS endpoint first for better reliability
      apiUrl = 'https://ai2.npaw.com:5500/generate';
      authHeader = { 'npaw-api-key': npawApiKey };
      
      // Build request body matching NPAW's expected format
      requestBody = {
        model: requestData.model || 'DeepSeek-V3',
        messages: requestData.messages,
        temperature: requestData.temperature || 0.7,
        max_tokens: requestData.max_tokens || 1000,
        stream: false // Ensure streaming is disabled for compatibility
      };
      
      console.log('NPAW Request details:', {
        url: apiUrl,
        model: requestBody.model,
        messageCount: requestBody.messages?.length,
        temperature: requestBody.temperature,
        maxTokens: requestBody.max_tokens
      });
      
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

      // Add tools support for local models if provided
      if (requestData.tools && requestData.tools.length > 0) {
        requestBody.tools = requestData.tools;
        requestBody.tool_choice = requestData.tool_choice || 'auto';
        console.log(`Local model: forwarding ${requestData.tools.length} tools with tool_choice: ${requestBody.tool_choice}`);
      }
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

      // Add tools and tool_choice for OpenAI
      if (requestData.tools && requestData.tools.length > 0) {
        requestBody.tools = requestData.tools;
        requestBody.tool_choice = requestData.tool_choice || 'auto';
        console.log(`OpenAI: forwarding ${requestData.tools.length} tools with tool_choice: ${requestBody.tool_choice}`);
        console.log('Tool names:', requestData.tools.map(t => t.function?.name || 'unknown'));
      } else {
        console.log('OpenAI: no tools provided in request');
      }
    }
      
    console.log(`Calling ${provider} API at: ${apiUrl}`);
    
    // Create a timeout controller for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      // Make the API call with timeout
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Enhanced error logging for NPAW
      if (!response.ok) {
        let errorBody = {};
        let errorText = '';
        
        try {
          errorText = await response.text();
          errorBody = JSON.parse(errorText);
        } catch (e) {
          errorBody = { raw_error: errorText };
        }
        
        console.error(`${provider} API error details:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorBody,
          url: apiUrl
        });
        
        // If NPAW HTTPS fails, try HTTP fallback
        if (provider === 'npaw' && apiUrl.startsWith('https://')) {
          console.log('NPAW HTTPS failed, trying HTTP fallback...');
          
          const httpUrl = 'http://ai2.npaw.com:5500/generate';
          
          try {
            const httpResponse = await fetch(httpUrl, {
              method: 'POST',
              headers: {
                ...authHeader,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestBody)
            });
            
            if (httpResponse.ok) {
              const httpData = await httpResponse.json();
              console.log('NPAW HTTP fallback successful');
              return new Response(
                JSON.stringify(httpData),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else {
              const httpErrorText = await httpResponse.text();
              console.error('NPAW HTTP fallback also failed:', {
                status: httpResponse.status,
                body: httpErrorText
              });
            }
          } catch (httpError) {
            console.error('NPAW HTTP fallback connection error:', httpError);
          }
        }
        
        // If NPAW fails completely, fallback to OpenAI
        if (provider === 'npaw') {
          console.log('NPAW completely failed, falling back to OpenAI...');
          
          const fallbackRequestBody = {
            model: 'gpt-4o-mini',
            messages: requestData.messages,
            temperature: requestData.temperature || 0.7,
            max_tokens: requestData.max_tokens || 1000
          };

          // Include tools in fallback if they were provided
          if (requestData.tools && requestData.tools.length > 0) {
            fallbackRequestBody.tools = requestData.tools;
            fallbackRequestBody.tool_choice = requestData.tool_choice || 'auto';
          }
          
          const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fallbackRequestBody)
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log('Fallback to OpenAI successful');
            return new Response(
              JSON.stringify({
                ...fallbackData,
                fallback_used: true,
                fallback_reason: `NPAW API error: ${response.status} - ${JSON.stringify(errorBody)}`
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ 
            error: `${provider} API error: ${response.status} ${response.statusText}`,
            details: errorBody
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse and return the response
      const data = await response.json();
      console.log(`${provider} API response received successfully`);
      
      // Log if tools were used in the response
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.tool_calls) {
        console.log(`${provider} model used ${data.choices[0].message.tool_calls.length} tools`);
      } else {
        console.log(`${provider} model did not use any tools`);
      }
      
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error(`${provider} API request timed out`);
        
        // If NPAW times out, fallback to OpenAI
        if (provider === 'npaw') {
          console.log('NPAW timed out, falling back to OpenAI...');
          
          try {
            const fallbackRequestBody = {
              model: 'gpt-4o-mini',
              messages: requestData.messages,
              temperature: requestData.temperature || 0.7,
              max_tokens: requestData.max_tokens || 1000
            };

            // Include tools in fallback if they were provided
            if (requestData.tools && requestData.tools.length > 0) {
              fallbackRequestBody.tools = requestData.tools;
              fallbackRequestBody.tool_choice = requestData.tool_choice || 'auto';
            }
            
            const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(fallbackRequestBody)
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              console.log('Fallback to OpenAI successful after timeout');
              return new Response(
                JSON.stringify({
                  ...fallbackData,
                  fallback_used: true,
                  fallback_reason: 'NPAW API timeout'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } catch (fallbackError) {
            console.error('Fallback to OpenAI also failed:', fallbackError);
          }
        }
        
        return new Response(
          JSON.stringify({ error: `${provider} API request timed out` }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error(`${provider} API request failed:`, error);
      
      // If NPAW fails with connection error, fallback to OpenAI
      if (provider === 'npaw') {
        console.log('NPAW connection failed, falling back to OpenAI...');
        
        try {
          const fallbackRequestBody = {
            model: 'gpt-4o-mini',
            messages: requestData.messages,
            temperature: requestData.temperature || 0.7,
            max_tokens: requestData.max_tokens || 1000
          };

          // Include tools in fallback if they were provided
          if (requestData.tools && requestData.tools.length > 0) {
            fallbackRequestBody.tools = requestData.tools;
            fallbackRequestBody.tool_choice = requestData.tool_choice || 'auto';
          }
          
          const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fallbackRequestBody)
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log('Fallback to OpenAI successful after connection error');
            return new Response(
              JSON.stringify({
                ...fallbackData,
                fallback_used: true,
                fallback_reason: `NPAW connection error: ${error.message}`
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (fallbackError) {
          console.error('Fallback to OpenAI also failed:', fallbackError);
        }
      }
      
      throw error;
    }

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
