
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Required environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 5, useEmbeddings = true } = await req.json();
    
    if (!query) {
      throw new Error('Query parameter is required');
    }

    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let results;
    
    if (useEmbeddings) {
      // Get embeddings for the query using OpenAI
      const embeddingsResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: query
        })
      });

      const embeddingsData = await embeddingsResponse.json();
      
      if (!embeddingsData.data || !embeddingsData.data[0].embedding) {
        throw new Error('Failed to generate embeddings for query');
      }

      const embedding = embeddingsData.data[0].embedding;

      // Query using vector similarity search
      const { data: vectorResults, error: vectorError } = await supabase.rpc(
        'match_knowledge_chunks',
        {
          query_embedding: embedding,
          match_threshold: 0.7,
          match_count: limit
        }
      );

      if (vectorError) {
        throw vectorError;
      }

      results = vectorResults;
    } else {
      // Fallback to text search if embeddings aren't used
      const { data: textResults, error: textError } = await supabase
        .from('knowledge_chunks')
        .select('*')
        .textSearch('content', query)
        .limit(limit);

      if (textError) {
        throw textError;
      }

      results = textResults;
    }

    // Format results for consistency with external sources format
    const formattedResults = results.map(chunk => {
      // Get file URL if it exists
      let fileUrl = '';
      if (chunk.file_path) {
        const { data } = supabase.storage
          .from('knowledge_files')
          .getPublicUrl(chunk.file_path);
        fileUrl = data.publicUrl;
      }
      
      return {
        title: chunk.title || 'Knowledge Document',
        link: chunk.source_url || fileUrl || '',
        snippet: chunk.content,
        source: chunk.original_file_type 
          ? `File: ${chunk.original_file_type.toUpperCase()}`
          : 'Internal Knowledge Base',
        date: new Date(chunk.created_at).toISOString().split('T')[0],
        relevanceScore: chunk.similarity || 1.0,
        fileType: chunk.original_file_type || null,
        filePath: chunk.file_path || null,
        fileUrl: fileUrl || null,
        metadata: chunk.metadata || {}
      };
    });

    return new Response(
      JSON.stringify({ results: formattedResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error querying knowledge base:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to query knowledge base',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
