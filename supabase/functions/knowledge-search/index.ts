
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { processQuery } from "./queryProcessor.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body more safely
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid JSON in request body',
          results: []
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle both MCP format and direct parameters
    let parameters;
    if (requestBody.action && requestBody.parameters) {
      // MCP format
      parameters = requestBody.parameters;
    } else {
      // Direct parameters format
      parameters = requestBody;
    }

    console.log('Knowledge search request:', { parameters });

    // Extract parameters with defaults
    const { 
      query, 
      limit = 5,
      includeNodes = true,
      matchThreshold = 0.3,
      useEmbeddings = true
    } = parameters;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Query parameter is required and must be a non-empty string',
          results: []
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use the query as-is - let semantic search do the work
    const cleanQuery = query.trim();
    console.log(`Processing query: "${cleanQuery}"`);
    
    try {
      // Use our local processQuery function
      const results = await processQuery({
        query: cleanQuery,
        limit: Math.max(1, Math.min(50, Number(limit))),
        useEmbeddings: Boolean(useEmbeddings),
        matchThreshold: Math.max(0.1, Math.min(1.0, Number(matchThreshold))),
        includeNodes: Boolean(includeNodes)
      });
      
      console.log(`Found ${results.length} results for query: "${cleanQuery}"`);
      
      // Record this execution for analytics if execution ID is provided
      const executionId = req.headers.get('x-execution-id');
      if (executionId) {
        try {
          await supabase.from('mcp_executions')
            .update({
              status: 'completed',
              result: { results, query: cleanQuery },
              execution_time: Date.now()
            })
            .eq('id', executionId);
        } catch (logError) {
          console.log('Non-critical error logging execution:', logError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          results: results,
          query: cleanQuery
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (processingError) {
      console.error('Error processing the knowledge search:', processingError);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Error processing knowledge search',
          details: processingError.message,
          results: []
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error in knowledge search function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to process knowledge search request',
        details: error.message,
        results: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
