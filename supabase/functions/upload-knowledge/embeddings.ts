
/**
 * Generate embeddings for text chunks using OpenAI with batch processing
 */
export async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Process in smaller batches to avoid token limits
  const batchSize = 20; // Process 20 chunks at a time
  const results: number[][] = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    console.log(`Processing embedding batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(chunks.length / batchSize)}`);
    
    try {
      const embeddingsResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: batch
        })
      });

      if (!embeddingsResponse.ok) {
        const errorData = await embeddingsResponse.json();
        throw new Error(`OpenAI API error (batch ${Math.floor(i / batchSize) + 1}): ${JSON.stringify(errorData.error || {})}`);
      }

      const embeddingsData = await embeddingsResponse.json();
      
      if (!embeddingsData.data) {
        throw new Error(`OpenAI API error (batch ${Math.floor(i / batchSize) + 1}): ${JSON.stringify(embeddingsData.error || {})}`);
      }
      
      const batchEmbeddings = embeddingsData.data.map((item: any) => item.embedding);
      results.push(...batchEmbeddings);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error processing embedding batch ${Math.floor(i / batchSize) + 1}:`, error);
      throw error;
    }
  }
  
  console.log(`Successfully generated ${results.length} embeddings in ${Math.ceil(chunks.length / batchSize)} batches`);
  return results;
}
