
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
    const { action, parameters } = await req.json();
    console.log('Knowledge search request:', { action, parameters });

    // Extract parameters
    const { 
      query, 
      sources = '',
      limit = 5,
      includeNodes = true,
      matchThreshold = 0.5
    } = parameters;
    
    if (!query) {
      throw new Error('Query parameter is required');
    }

    try {
      // Use our local processQuery function
      const results = await processQuery({
        query,
        limit: Number(limit),
        useEmbeddings: true,
        matchThreshold,
        includeNodes
      });

      // Record this execution for analytics
      const { error: logError } = await supabase.from('mcp_executions')
        .update({
          status: 'completed',
          result: { results },
          execution_time: new Date().getTime() - new Date().getTime() // placeholder
        })
        .eq('id', req.headers.get('x-execution-id') || '')
        .is('error', null);
      
      if (logError) {
        console.log('Non-critical error logging execution:', logError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          results: results
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
          results: [] // Return empty results instead of failing completely
        }),
        { 
          status: 200, // Use 200 even for processing errors to avoid 500
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error parsing request:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to process knowledge search request',
        details: error.message,
        results: [] // Return empty results
      }),
      { 
        status: 400, // 400 for malformed requests
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
