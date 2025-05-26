
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  console.log('=== Knowledge Proxy Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const rawBody = await req.text();
    console.log('Raw request body length:', rawBody.length);
    console.log('Raw request body content:', rawBody);
    
    let requestData;
    try {
      requestData = JSON.parse(rawBody);
      console.log('Successfully parsed JSON. Keys:', Object.keys(requestData));
      console.log('Parsed request body:', JSON.stringify(requestData, null, 2));
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    console.log('Processing knowledge request');
    
    // Extract parameters - handle both direct and nested formats
    let query, limit, includeNodes, matchThreshold, useEmbeddings;
    
    if (requestData.action === 'search' && requestData.parameters) {
      // New nested format from AI agent
      const params = requestData.parameters;
      query = params.query;
      limit = params.limit || 5;
      includeNodes = params.includeNodes !== false;
      matchThreshold = params.matchThreshold || 0.5;
      useEmbeddings = params.useEmbeddings !== false;
    } else {
      // Direct format (backward compatibility)
      query = requestData.query;
      limit = requestData.limit || 5;
      includeNodes = requestData.includeNodes !== false;
      matchThreshold = requestData.matchThreshold || 0.5;
      useEmbeddings = requestData.useEmbeddings !== false;
    }

    console.log('Execution ID:', requestData.executionId);
    console.log('Query:', `"${query}"`);
    console.log('Parameters: limit=' + limit + ', includeNodes=' + includeNodes + ', useEmbeddings=' + useEmbeddings);

    if (!query || typeof query !== 'string' || query.trim() === '') {
      console.error('Missing query parameter');
      console.error('=== Knowledge Proxy Error ===');
      console.error('Error details:', {
        name: 'Error',
        message: 'Query parameter is required',
        stack: new Error('Query parameter is required').stack
      });
      
      return new Response(
        JSON.stringify({
          error: 'Query parameter is required',
          status: 'failed',
          data: null,
          debug: {
            bodyReceived: !!rawBody,
            bodyLength: rawBody.length,
            bodyContent: rawBody.substring(0, 100),
            parsedData: requestData
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call the query-knowledge-base function
    console.log('Calling query-knowledge-base function with:', {
      query,
      limit,
      useEmbeddings,
      matchThreshold,
      includeNodes
    });

    const { data: searchResults, error: searchError } = await supabase.functions.invoke('query-knowledge-base', {
      body: {
        query: query.trim(),
        limit,
        useEmbeddings,
        matchThreshold,
        includeNodes
      }
    });

    if (searchError) {
      console.error('Search error:', searchError);
      return new Response(
        JSON.stringify({
          error: 'Search failed: ' + searchError.message,
          status: 'failed',
          data: null
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Search completed successfully, results:', searchResults?.results?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        status: 'completed',
        data: searchResults?.results || [],
        results: searchResults?.results || [], // For backward compatibility
        resultCount: searchResults?.results?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Knowledge Proxy Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
        status: 'failed',
        data: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
