
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { handleTextContent } from "./textProcessor.ts";
import { handleFileContent } from "./fileProcessor.ts";
import { createSupabaseClient } from "./supabaseClient.ts";

// Serve the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const body = await req.json();

    // Initialize Supabase client
    const supabase = createSupabaseClient();

    // Process based on content type
    if (body.contentType === 'text') {
      return await handleTextContent(body, supabase);
    } 
    else if (body.contentType === 'file') {
      return await handleFileContent(body, supabase);
    }
    else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid content type' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error processing knowledge upload:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to process upload',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
