
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { processQuery } from "./queryProcessor.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Enhanced query cleaning that handles company names and meeting-specific terms
 */
function cleanSearchQuery(query: string): string {
  if (!query) return '';
  
  let cleaned = query.toLowerCase().trim();
  
  // Preserve important company names and meeting terms
  const preserveTerms = ['npaw', 'adsmurai', 'meeting', 'discussed', 'reunión', 'discutido'];
  const preservedWords: string[] = [];
  
  // Extract preserved terms first
  for (const term of preserveTerms) {
    if (cleaned.includes(term)) {
      preservedWords.push(term);
    }
  }
  
  // Remove common search prefixes that interfere with semantic matching
  const searchPrefixes = [
    'what was discussed in',
    'what happened in',
    'tell me about',
    'search for',
    'search',
    'find',
    'look for',
    'lookup',
    'get information about',
    'information about',
    'what is',
    'who is',
    'about'
  ];
  
  for (const prefix of searchPrefixes) {
    const pattern = new RegExp(`^${prefix}\\s+`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Combine preserved terms with cleaned query
  const finalTerms = [...preservedWords];
  const remainingWords = cleaned.split(/\s+/).filter(word => 
    word.length > 2 && !preserveTerms.includes(word)
  );
  
  finalTerms.push(...remainingWords);
  
  return finalTerms.join(' ').trim();
}

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

    // Extract parameters with better defaults
    const { 
      query, 
      limit = 5,
      includeNodes = true,
      matchThreshold = 0.3, // Lower threshold for better recall
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

    // Clean the query before processing
    const originalQuery = query.trim();
    const cleanedQuery = cleanSearchQuery(originalQuery);
    console.log(`Original query: "${originalQuery}" -> Cleaned query: "${cleanedQuery}"`);
    
    // Use the best available query
    const queryToUse = cleanedQuery || originalQuery;
    
    try {
      // Use our local processQuery function with enhanced parameters
      const results = await processQuery({
        query: queryToUse,
        limit: Math.max(1, Math.min(50, Number(limit))), // Ensure reasonable limits
        useEmbeddings: Boolean(useEmbeddings),
        matchThreshold: Math.max(0.1, Math.min(1.0, Number(matchThreshold))), // Ensure valid threshold
        includeNodes: Boolean(includeNodes)
      });
      
      console.log(`Found ${results.length} results for query: "${queryToUse}"`);
      
      // Record this execution for analytics if execution ID is provided
      const executionId = req.headers.get('x-execution-id');
      if (executionId) {
        try {
          await supabase.from('mcp_executions')
            .update({
              status: 'completed',
              result: { results, query: queryToUse, originalQuery },
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
          query: queryToUse,
          originalQuery
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
          status: 200, // Use 200 to avoid breaking the flow
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
        results: [] // Return empty results
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
