
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-execution-id, x-provider-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, parameters, executionId } = await req.json();
    
    if (!action) {
      throw new Error('Action ID is required');
    }

    console.log(`Processing knowledge request for action: ${action}`);
    console.log(`Parameters:`, JSON.stringify(parameters));
    
    // Get authorization header if present
    const authHeader = req.headers.get('Authorization') || '';
    const executionIdHeader = req.headers.get('x-execution-id') || '';
    const providerTokenHeader = req.headers.get('x-provider-token') || '';
    
    // Build headers for the external API call
    const apiHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Copy authorization if present
    if (authHeader) {
      apiHeaders['Authorization'] = authHeader;
    }
    
    // Add execution ID if present
    if (executionIdHeader) {
      apiHeaders['x-execution-id'] = executionIdHeader;
    }
    
    // Add provider token if present
    if (providerTokenHeader) {
      apiHeaders['x-provider-token'] = providerTokenHeader;
    }

    // Construct proper sources parameter if needed
    if (parameters.sources === "") {
      // If sources is an empty string, replace with empty array or remove
      delete parameters.sources;
    }
    
    console.log(`Calling external API with headers:`, JSON.stringify(apiHeaders, null, 2));
    
    // Make the actual API call to the external service
    const apiResponse = await fetch('https://api.zeroloop.ai/mcp/knowledge', {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ 
        action,
        parameters
      }),
    });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`External API error: ${apiResponse.status} ${apiResponse.statusText}`, errorText);
      throw new Error(`API error: ${apiResponse.status} ${apiResponse.statusText}. ${errorText}`);
    }
    
    const apiData = await apiResponse.json();
    console.log(`External API response:`, JSON.stringify(apiData, null, 2));
    
    return new Response(JSON.stringify(apiData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in knowledge-proxy function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during knowledge request',
        status: 'failed',
        data: null 
      }),
      { 
        status: 200, // Return 200 even for errors to allow client-side handling
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
