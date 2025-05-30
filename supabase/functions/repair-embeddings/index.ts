
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateEmbedding(text: string): Promise<number[]> {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting embedding repair process...');

    // Find chunks without embeddings
    const { data: chunksWithoutEmbeddings, error: fetchError } = await supabase
      .from('knowledge_chunks')
      .select('id, title, content')
      .is('embedding', null)
      .limit(50); // Process in batches to avoid timeouts

    if (fetchError) {
      throw new Error(`Failed to fetch chunks: ${fetchError.message}`);
    }

    if (!chunksWithoutEmbeddings || chunksWithoutEmbeddings.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No chunks found without embeddings',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${chunksWithoutEmbeddings.length} chunks without embeddings`);

    let processed = 0;
    let errors = 0;

    // Process each chunk
    for (const chunk of chunksWithoutEmbeddings) {
      try {
        console.log(`Processing chunk ${chunk.id}: ${chunk.title?.substring(0, 50)}...`);
        
        // Generate embedding for the content
        const embedding = await generateEmbedding(chunk.content);
        
        // Update the chunk with the embedding
        const { error: updateError } = await supabase
          .from('knowledge_chunks')
          .update({ embedding })
          .eq('id', chunk.id);

        if (updateError) {
          console.error(`Failed to update chunk ${chunk.id}:`, updateError);
          errors++;
        } else {
          processed++;
          console.log(`✅ Updated chunk ${chunk.id} with embedding`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing chunk ${chunk.id}:`, error);
        errors++;
      }
    }

    const message = `Processed ${processed} chunks successfully. ${errors} errors encountered.`;
    console.log(message);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        processed,
        errors,
        total: chunksWithoutEmbeddings.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in repair-embeddings function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to repair embeddings',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
