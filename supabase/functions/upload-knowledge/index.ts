import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Required environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Split text into chunks of appropriate size
function splitIntoChunks(text, maxChunkSize = 1000, overlapSize = 100) {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    // Find a good breakpoint (preferably at the end of a sentence or paragraph)
    let endIndex = Math.min(startIndex + maxChunkSize, text.length);
    
    if (endIndex < text.length) {
      // Try to find sentence endings (. ! ?) followed by a space or newline
      const lastSentenceEnd = Math.max(
        text.lastIndexOf('. ', endIndex),
        text.lastIndexOf('! ', endIndex),
        text.lastIndexOf('? ', endIndex),
        text.lastIndexOf('.\n', endIndex),
        text.lastIndexOf('!\n', endIndex),
        text.lastIndexOf('?\n', endIndex)
      );
      
      // If we found a good breakpoint, use it
      if (lastSentenceEnd > startIndex + maxChunkSize / 2) {
        endIndex = lastSentenceEnd + 1;
      } else {
        // Otherwise try to break at a space
        const lastSpace = text.lastIndexOf(' ', endIndex);
        if (lastSpace > startIndex + maxChunkSize / 2) {
          endIndex = lastSpace + 1;
        }
      }
    }
    
    chunks.push(text.substring(startIndex, endIndex));
    
    // Move start index with overlap
    startIndex = Math.max(startIndex, endIndex - overlapSize);
  }
  
  return chunks;
}

// Generate embeddings for a chunk of text
async function generateEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });
  
  const result = await response.json();
  
  if (!result.data || !result.data[0].embedding) {
    throw new Error('Failed to generate embedding');
  }
  
  return result.data[0].embedding;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { 
      title, 
      content, 
      metadata = {}, 
      domain_id = null, 
      source_url = null, 
      chunk_size = 1000, 
      overlap = 100,
      user_id = null
    } = await req.json();
    
    if (!title || !content) {
      throw new Error('Title and content are required');
    }
    
    // Split content into chunks
    const chunks = splitIntoChunks(content, chunk_size, overlap);
    console.log(`Split content into ${chunks.length} chunks`);
    
    // Process chunks and generate embeddings
    const processedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const chunkTitle = `${title} (part ${i + 1}/${chunks.length})`;
      
      // Generate embedding for the chunk
      const embedding = await generateEmbedding(chunkText);
      
      processedChunks.push({
        title: chunkTitle,
        content: chunkText,
        metadata: {
          ...metadata,
          chunk_index: i,
          total_chunks: chunks.length
        },
        domain_id,
        source_url,
        user_id,
        embedding
      });
    }
    
    // Insert processed chunks into the knowledge_chunks table
    const { data, error } = await supabase
      .from('knowledge_chunks')
      .insert(processedChunks)
      .select('id');
      
    if (error) {
      throw error;
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully processed ${chunks.length} chunks`, 
        chunk_ids: data.map(c => c.id)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing knowledge upload:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to process knowledge upload',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
