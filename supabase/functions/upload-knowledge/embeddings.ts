
import { supabase } from "https://esm.sh/@supabase/supabase-js@2.38.5"

/**
 * Generate embeddings using OpenAI's text-embedding-ada-002 model
 * with batching and progress tracking support
 */
export async function generateEmbeddings(
  texts: string[], 
  uploadId?: string, 
  supabaseClient?: any
): Promise<number[][]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Process in smaller batches to avoid rate limits and memory issues
  const BATCH_SIZE = 5;
  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    console.log(`Processing embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)}`);
    
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: batch,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from OpenAI API');
      }

      // Extract embeddings from the response
      const batchEmbeddings = data.data.map((item: any) => item.embedding);
      embeddings.push(...batchEmbeddings);
      
      // Update progress if tracking
      if (uploadId && supabaseClient) {
        const progressPercentage = Math.floor(((i + BATCH_SIZE) / texts.length) * 100);
        await supabaseClient.from('upload_progress').update({
          progress: Math.min(55 + Math.floor(progressPercentage * 0.25), 80), // 55-80% range for embeddings
          message: `Generated embeddings for ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks`,
          updated_at: new Date().toISOString()
        }).eq('id', uploadId);
      }
      
      // Add small delay between batches to be respectful to the API
      if (i + BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`Error generating embeddings for batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  console.log(`Successfully generated ${embeddings.length} embeddings`);
  return embeddings;
}
