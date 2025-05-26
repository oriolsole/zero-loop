
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
      matchThreshold = params.matchThreshold || 0.3; // Lowered default threshold
      useEmbeddings = params.useEmbeddings !== false;
    } else {
      // Direct format (backward compatibility)
      query = requestData.query;
      limit = requestData.limit || 5;
      includeNodes = requestData.includeNodes !== false;
      matchThreshold = requestData.matchThreshold || 0.3; // Lowered default threshold
      useEmbeddings = requestData.useEmbeddings !== false;
    }

    console.log('Execution ID:', requestData.executionId);
    console.log('Query:', `"${query}"`);
    console.log('Parameters: limit=' + limit + ', includeNodes=' + includeNodes + ', useEmbeddings=' + useEmbeddings);

    if (!query || typeof query !== 'string' || query.trim() === '') {
      console.error('Missing query parameter');
      throw new Error('Query parameter is required and must be a non-empty string');
    }

    // Call the query-knowledge-base function
    console.log(`Calling query-knowledge-base function with: ${JSON.stringify({
      query,
      limit,
      useEmbeddings,
      matchThreshold,
      includeNodes
    })}`);

    try {
      const { data: queryResults, error: queryError } = await supabase.functions.invoke('query-knowledge-base', {
        body: {
          query,
          limit,
          useEmbeddings,
          matchThreshold,
          includeNodes
        }
      });
      
      if (queryError) {
        console.error('Error calling query-knowledge-base:', queryError);
        throw new Error(`Failed to query knowledge base: ${queryError.message}`);
      }
      
      // Check for error in the response
      if (queryResults && queryResults.error) {
        console.error('Query knowledge base returned an error:', queryResults.error);
        throw new Error(queryResults.error);
      }
      
      const results = queryResults?.results || [];
      console.log('Search completed successfully, results:', results.length);
      
      // Record execution for analytics if execution ID provided
      if (requestData.executionId) {
        try {
          await supabase
            .from('mcp_executions')
            .update({
              result: { results },
              status: 'completed',
              execution_time: new Date().getTime() - new Date().getTime() // placeholder
            })
            .eq('id', requestData.executionId);
        } catch (logError) {
          // Non-critical error, just log
          console.log('Non-critical error updating execution record:', logError);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          error: null,
          resultCount: results.length,
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (searchError) {
      console.error('Error searching knowledge base:', searchError);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Error searching knowledge base: ${searchError.message}`,
          resultCount: 0,
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Failed to process request: ${error.message}`,
        resultCount: 0,
        results: [] 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
