
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { processQuery } from "./queryProcessor.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      limit = 5, 
      useEmbeddings = true, 
      matchThreshold = 0.5,
      includeNodes = false // New parameter to include knowledge nodes
    } = await req.json();
    
    if (!query) {
      throw new Error('Query parameter is required');
    }

    try {
      const results = await processQuery({
        query,
        limit,
        useEmbeddings,
        matchThreshold,
        includeNodes
      });

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (processingError) {
      console.error('Error processing the query:', processingError);
      
      return new Response(
        JSON.stringify({ 
          error: 'Error processing knowledge query',
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
        error: 'Failed to query knowledge base',
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
