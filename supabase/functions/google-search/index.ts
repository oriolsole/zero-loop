
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
    
    // Fixed: Removed 'formattedDate' from the fields parameter which was causing the error
    searchUrl.searchParams.append('fields', 'items(title,link,snippet,displayLink,pagemap,fileFormat,mime,formattedUrl,htmlFormattedUrl,htmlSnippet)');
    
    const response = await fetch(searchUrl.toString());
    const data = await response.json();
    
    if (!response.ok) {
      console.error("Google API error:", data);
      return new Response(
        JSON.stringify({ error: "Search API error", details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process and limit search results with enhanced information
    const processedResults = data.items?.slice(0, limit).map(item => {
      // Extract content type
      let contentType = "webpage";
      let thumbnailUrl = null;
      let publisher = null;
      let datePublished = null; // New variable to store extracted date
      
      // Extract information from pagemap if available
      if (item.pagemap) {
        // Get content type
        if (item.pagemap.metatags?.length > 0) {
          // Check for og:type
          const ogType = item.pagemap.metatags[0]["og:type"];
          if (ogType) contentType = ogType;
          
          // Extract date from metatags - check common date meta tags
          const possibleDateFields = [
            "article:published_time",
            "date",
            "og:published_time",
            "datePublished",
            "publication_date",
            "pubdate"
          ];
          
          for (const dateField of possibleDateFields) {
            if (item.pagemap.metatags[0][dateField]) {
              datePublished = item.pagemap.metatags[0][dateField];
              break;
            }
          }
        }
        
        // If date wasn't found in metatags, try other common pagemap locations
        if (!datePublished) {
          if (item.pagemap.newsarticle?.length > 0 && item.pagemap.newsarticle[0].datepublished) {
            datePublished = item.pagemap.newsarticle[0].datepublished;
          } else if (item.pagemap.article?.length > 0 && item.pagemap.article[0].datepublished) {
            datePublished = item.pagemap.article[0].datepublished;
          }
        }
        
        // Get thumbnail
        if (item.pagemap.cse_thumbnail?.length > 0) {
          thumbnailUrl = item.pagemap.cse_thumbnail[0].src;
        } else if (item.pagemap.cse_image?.length > 0) {
          thumbnailUrl = item.pagemap.cse_image[0].src;
        }
        
        // Get publisher
        if (item.pagemap.organization?.length > 0) {
          publisher = item.pagemap.organization[0].name;
        } else if (item.pagemap.author?.length > 0) {
          publisher = item.pagemap.author[0].name;
        }
      }
      
      // Get file format if present
      let fileFormat = item.fileFormat || null;
      if (!fileFormat && item.mime) {
        fileFormat = item.mime.split('/').pop();
      }
      
      // Create enhanced result object
      return {
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        source: item.displayLink,
        date: datePublished, // Use the extracted date
        sourceType: 'web',
        contentType: contentType,
        thumbnailUrl: thumbnailUrl,
        fileFormat: fileFormat,
        description: item.htmlSnippet || item.snippet,
        publisher: publisher
      };
    }) || [];
    
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
