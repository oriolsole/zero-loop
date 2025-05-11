
// Google Search Edge Function for ZeroLoop
// Securely interfaces with Google Custom Search API using environment variables

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Main handler function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { query, limit = 5 } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment variable
    const apiKey = Deno.env.get("GOOGLE_SEARCH_KEY");
    const cx = Deno.env.get("GOOGLE_SEARCH_CX"); // Custom Search Engine ID
    
    if (!apiKey) {
      console.error("Missing GOOGLE_SEARCH_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Search service configuration error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!cx) {
      console.error("Missing GOOGLE_SEARCH_CX environment variable");
      return new Response(
        JSON.stringify({ error: "Search service configuration error - missing search engine ID" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Performing search for: "${query}" with limit: ${limit}`);
    
    // Make request to Google Custom Search API
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.append('key', apiKey);
    searchUrl.searchParams.append('cx', cx);
    searchUrl.searchParams.append('q', query);
    
    const response = await fetch(searchUrl.toString());
    const data = await response.json();
    
    if (!response.ok) {
      console.error("Google API error:", data);
      return new Response(
        JSON.stringify({ error: "Search API error", details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process and limit search results
    const processedResults = data.items?.slice(0, limit).map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      source: item.displayLink,
      date: item.formattedDate || null
    })) || [];
    
    // Return processed search results
    return new Response(
      JSON.stringify({ results: processedResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error processing search request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
