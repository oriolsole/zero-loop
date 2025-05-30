
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
      matchThreshold = 0.2, // Lowered from 0.5 to 0.2 for better recall
      includeNodes = false
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
          results: []
        }),
        { 
          status: 200,
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
        results: []
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
