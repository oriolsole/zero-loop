
/**
 * Estimate token count for a text string (rough approximation)
 */
function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Generate embeddings for text chunks using OpenAI with token-aware batch processing
 */
export async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Token limits for text-embedding-3-small model
  const MAX_TOKENS_PER_BATCH = 7000; // Safety margin below 8192 limit
  const results: number[][] = [];
  
  let currentBatch: string[] = [];
  let currentBatchTokens = 0;
  let batchNumber = 1;
  
  console.log(`Starting embedding generation for ${chunks.length} chunks`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkTokens = estimateTokenCount(chunk);
    
    // If adding this chunk would exceed the token limit, process current batch
    if (currentBatchTokens + chunkTokens > MAX_TOKENS_PER_BATCH && currentBatch.length > 0) {
      console.log(`Processing batch ${batchNumber} with ${currentBatch.length} chunks (${currentBatchTokens} tokens)`);
      
      try {
        const batchEmbeddings = await processBatch(currentBatch, openaiApiKey, batchNumber);
        results.push(...batchEmbeddings);
        
        // Small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing batch ${batchNumber}:`, error);
        throw error;
      }
      
      // Reset for next batch
      currentBatch = [];
      currentBatchTokens = 0;
      batchNumber++;
    }
    
    // If a single chunk is too large, try to process it individually
    if (chunkTokens > MAX_TOKENS_PER_BATCH) {
      console.warn(`Chunk ${i} has ${chunkTokens} tokens, exceeding limit. Attempting individual processing.`);
      
      try {
        const individualEmbedding = await processBatch([chunk], openaiApiKey, `${batchNumber}-individual`);
        results.push(...individualEmbedding);
      } catch (error) {
        console.error(`Failed to process oversized chunk ${i}:`, error);
        // Skip this chunk and continue
        console.log(`Skipping chunk ${i} due to size constraints`);
        results.push(new Array(1536).fill(0)); // Default embedding dimension for text-embedding-3-small
      }
      continue;
    }
    
    // Add chunk to current batch
    currentBatch.push(chunk);
    currentBatchTokens += chunkTokens;
  }
  
  // Process remaining chunks in the last batch
  if (currentBatch.length > 0) {
    console.log(`Processing final batch ${batchNumber} with ${currentBatch.length} chunks (${currentBatchTokens} tokens)`);
    
    try {
      const batchEmbeddings = await processBatch(currentBatch, openaiApiKey, batchNumber);
      results.push(...batchEmbeddings);
    } catch (error) {
      console.error(`Error processing final batch ${batchNumber}:`, error);
      throw error;
    }
  }
  
  console.log(`Successfully generated ${results.length} embeddings in ${batchNumber} batches`);
  return results;
}

/**
 * Process a single batch of chunks for embeddings
 */
async function processBatch(batch: string[], apiKey: string, batchId: string | number): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: batch
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error (batch ${batchId}): ${JSON.stringify(errorData.error || {})}`);
  }

  const embeddingsData = await response.json();
  
  if (!embeddingsData.data) {
    throw new Error(`OpenAI API error (batch ${batchId}): ${JSON.stringify(embeddingsData.error || {})}`);
  }
  
  return embeddingsData.data.map((item: any) => item.embedding);
}
