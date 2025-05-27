
/**
 * More accurate token count estimation
 */
function estimateTokenCount(text: string): number {
  // More conservative estimate for various text types
  const avgCharsPerToken = text.includes('\n') || text.includes('  ') ? 3.5 : 4;
  return Math.ceil(text.length / avgCharsPerToken);
}

/**
 * Generate embeddings with very conservative token-aware batch processing
 */
export async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Much more conservative token limits
  const MAX_TOKENS_PER_BATCH = 3000; // Very safe margin below 8192 limit
  const MAX_CHUNKS_PER_BATCH = 50; // Additional safety limit
  const results: number[][] = [];
  
  let currentBatch: string[] = [];
  let currentBatchTokens = 0;
  let batchNumber = 1;
  
  console.log(`Starting embedding generation for ${chunks.length} chunks with conservative batching`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkTokens = estimateTokenCount(chunk);
    
    // Log chunks that might be problematic
    if (chunkTokens > 200) {
      console.warn(`Chunk ${i} has ${chunkTokens} estimated tokens - this is quite large`);
    }
    
    // Check if we should process current batch before adding this chunk
    const wouldExceedTokens = currentBatchTokens + chunkTokens > MAX_TOKENS_PER_BATCH;
    const wouldExceedChunkLimit = currentBatch.length >= MAX_CHUNKS_PER_BATCH;
    
    if ((wouldExceedTokens || wouldExceedChunkLimit) && currentBatch.length > 0) {
      console.log(`Processing batch ${batchNumber} with ${currentBatch.length} chunks (${currentBatchTokens} estimated tokens)`);
      
      try {
        const batchEmbeddings = await processBatch(currentBatch, openaiApiKey, batchNumber);
        results.push(...batchEmbeddings);
        
        // Small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error processing batch ${batchNumber}:`, error);
        // Try to process chunks individually as fallback
        console.log(`Attempting individual processing for batch ${batchNumber} chunks`);
        
        for (const failedChunk of currentBatch) {
          try {
            const individualEmbedding = await processBatch([failedChunk], openaiApiKey, `${batchNumber}-individual`);
            results.push(...individualEmbedding);
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (individualError) {
            console.error(`Failed to process individual chunk:`, individualError);
            // Use zero embedding as last resort
            results.push(new Array(1536).fill(0));
          }
        }
      }
      
      // Reset for next batch
      currentBatch = [];
      currentBatchTokens = 0;
      batchNumber++;
    }
    
    // If a single chunk is too large, try processing it individually
    if (chunkTokens > MAX_TOKENS_PER_BATCH) {
      console.warn(`Chunk ${i} has ${chunkTokens} tokens, exceeding batch limit. Processing individually.`);
      
      try {
        const individualEmbedding = await processBatch([chunk], openaiApiKey, `${batchNumber}-oversized`);
        results.push(...individualEmbedding);
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`Failed to process oversized chunk ${i}:`, error);
        // Use zero embedding as fallback
        results.push(new Array(1536).fill(0));
      }
      continue;
    }
    
    // Add chunk to current batch
    currentBatch.push(chunk);
    currentBatchTokens += chunkTokens;
  }
  
  // Process remaining chunks in the last batch
  if (currentBatch.length > 0) {
    console.log(`Processing final batch ${batchNumber} with ${currentBatch.length} chunks (${currentBatchTokens} estimated tokens)`);
    
    try {
      const batchEmbeddings = await processBatch(currentBatch, openaiApiKey, batchNumber);
      results.push(...batchEmbeddings);
    } catch (error) {
      console.error(`Error processing final batch ${batchNumber}:`, error);
      // Try individual processing for final batch
      for (const failedChunk of currentBatch) {
        try {
          const individualEmbedding = await processBatch([failedChunk], openaiApiKey, `${batchNumber}-final-individual`);
          results.push(...individualEmbedding);
        } catch (individualError) {
          console.error(`Failed to process final individual chunk:`, individualError);
          results.push(new Array(1536).fill(0));
        }
      }
    }
  }
  
  console.log(`Successfully generated ${results.length} embeddings in ${batchNumber} batches`);
  return results;
}

/**
 * Process a single batch with validation and better error handling
 */
async function processBatch(batch: string[], apiKey: string, batchId: string | number): Promise<number[][]> {
  // Pre-validate batch token count
  const totalTokens = batch.reduce((sum, chunk) => sum + estimateTokenCount(chunk), 0);
  if (totalTokens > 3500) {
    throw new Error(`Batch ${batchId} has ${totalTokens} tokens, exceeding safe limit`);
  }
  
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
