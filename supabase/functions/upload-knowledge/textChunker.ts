/**
 * More accurate token count estimation for various text types
 */
function estimateTokenCount(text: string): number {
  // More conservative estimate for PDF text which often has formatting artifacts
  // Use 3.5 characters per token for PDF content, 4 for regular text
  const avgCharsPerToken = text.includes('\n') || text.includes('  ') ? 3.5 : 4;
  return Math.ceil(text.length / avgCharsPerToken);
}

/**
 * Split text into much smaller chunks to ensure token limits are respected
 */
export function chunkText(text: string, chunkSize: number = 400, overlap: number = 50): string[] {
  const chunks: string[] = [];
  
  // Clean up the text - normalize whitespace but preserve structure
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  // Much more conservative chunk size - aim for ~100 tokens max per chunk
  const maxChunkSize = Math.min(chunkSize, 400); // 400 chars ≈ 100-115 tokens
  
  // If text is shorter than chunk size, return as a single chunk
  if (cleanedText.length <= maxChunkSize) {
    return [cleanedText];
  }
  
  // Split into sentences first to maintain coherence
  const sentences = cleanedText.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If sentence alone is too long, split it by words
    if (sentence.length > maxChunkSize) {
      // Save current chunk if it has content
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Add overlap from previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 10)).join(' ');
        currentChunk = overlapWords;
      }
      
      // Split long sentence by words
      const words = sentence.split(' ');
      let wordChunk = currentChunk;
      
      for (const word of words) {
        if ((wordChunk + ' ' + word).length > maxChunkSize) {
          if (wordChunk.trim()) {
            chunks.push(wordChunk.trim());
            // Keep some overlap
            const chunkWords = wordChunk.split(' ');
            const keepWords = chunkWords.slice(-Math.floor(overlap / 15));
            wordChunk = keepWords.join(' ');
          }
        }
        wordChunk += (wordChunk.trim() ? ' ' : '') + word;
      }
      
      currentChunk = wordChunk;
    }
    // If adding this sentence would exceed chunk size
    else if ((currentChunk + ' ' + sentence).length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        // Add overlap from previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 10)).join(' ');
        currentChunk = overlapWords + ' ' + sentence;
      } else {
        currentChunk = sentence;
      }
    }
    // Add sentence to current chunk
    else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  // Push any remaining content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // Filter out empty chunks and validate token counts
  const filteredChunks = chunks.filter(chunk => chunk.length > 0);
  
  // Log chunk statistics with improved validation
  const totalTokens = filteredChunks.reduce((sum, chunk) => sum + estimateTokenCount(chunk), 0);
  const avgTokensPerChunk = Math.round(totalTokens / filteredChunks.length);
  const maxTokensInChunk = Math.max(...filteredChunks.map(chunk => estimateTokenCount(chunk)));
  
  console.log(`Created ${filteredChunks.length} chunks:`);
  console.log(`- Total estimated tokens: ${totalTokens}`);
  console.log(`- Average tokens per chunk: ${avgTokensPerChunk}`);
  console.log(`- Max tokens in a chunk: ${maxTokensInChunk}`);
  
  // Warn if any chunks are still potentially too large
  if (maxTokensInChunk > 150) {
    console.warn(`Warning: Some chunks exceed 150 tokens (max: ${maxTokensInChunk}). Consider reducing chunk size further.`);
  }
  
  return filteredChunks;
}
