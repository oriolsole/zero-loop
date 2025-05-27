
/**
 * Estimate token count for a text string (rough approximation)
 */
function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks with overlap, ensuring token limits are respected
 */
export function chunkText(text: string, chunkSize: number = 800, overlap: number = 100): string[] {
  const chunks: string[] = [];
  
  // Clean up the text - normalize whitespace
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  // Ensure chunk size doesn't exceed token limits (aim for ~500 tokens max)
  const maxChunkSize = Math.min(chunkSize, 2000); // 2000 chars ≈ 500 tokens
  
  // If text is shorter than chunk size, return as a single chunk
  if (cleanedText.length <= maxChunkSize) {
    return [cleanedText];
  }
  
  // Split into paragraphs first to try to maintain context
  const paragraphs = cleanedText.split(/\n+/);
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If paragraph is too long, split it further
    if (paragraph.length > maxChunkSize) {
      // If we have content in the current chunk, push it first
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Split long paragraph into sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      let sentenceChunk = '';
      
      for (const sentence of sentences) {
        // If adding this sentence exceeds chunk size, push the chunk and start a new one
        if ((sentenceChunk + ' ' + sentence).length > maxChunkSize) {
          if (sentenceChunk) {
            chunks.push(sentenceChunk.trim());
            // Keep some overlap with the previous chunk for context
            const words = sentenceChunk.split(' ');
            const overlapWords = words.slice(Math.max(0, words.length - Math.floor(overlap / 10))).join(' ');
            sentenceChunk = overlapWords;
          }
        }
        
        sentenceChunk += ' ' + sentence;
        
        // If we've exceeded chunk size, push it
        if (sentenceChunk.length >= maxChunkSize) {
          chunks.push(sentenceChunk.trim());
          // Reset with overlap
          const words = sentenceChunk.split(' ');
          const overlapWords = words.slice(Math.max(0, words.length - Math.floor(overlap / 10))).join(' ');
          sentenceChunk = overlapWords;
        }
      }
      
      // Add any remaining content
      if (sentenceChunk && sentenceChunk.length > overlap / 5) {
        currentChunk = sentenceChunk;
      }
    }
    // If paragraph fits in a chunk, add it
    else if ((currentChunk + ' ' + paragraph).length <= maxChunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + paragraph;
    }
    // Otherwise, push the current chunk and start a new one
    else {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    }
  }
  
  // Push any remaining content
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  // Filter out empty chunks and log token estimates
  const filteredChunks = chunks.filter(chunk => chunk.length > 0);
  
  // Log chunk statistics
  const totalTokens = filteredChunks.reduce((sum, chunk) => sum + estimateTokenCount(chunk), 0);
  const avgTokensPerChunk = Math.round(totalTokens / filteredChunks.length);
  console.log(`Created ${filteredChunks.length} chunks, estimated ${totalTokens} total tokens, ${avgTokensPerChunk} avg tokens per chunk`);
  
  return filteredChunks;
}
