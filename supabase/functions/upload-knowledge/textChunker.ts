/**
 * Split text into chunks with overlap
 */
export function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  
  // Clean up the text - normalize whitespace
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  // If text is shorter than chunk size, return as a single chunk
  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }
  
  // Split into paragraphs first to try to maintain context
  const paragraphs = cleanedText.split(/\n+/);
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If paragraph is too long, split it further
    if (paragraph.length > chunkSize) {
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
        if ((sentenceChunk + ' ' + sentence).length > chunkSize) {
          if (sentenceChunk) {
            chunks.push(sentenceChunk.trim());
            // Keep some overlap with the previous chunk for context
            const words = sentenceChunk.split(' ');
            const overlapWords = words.slice(Math.max(0, words.length - overlap / 10)).join(' ');
            sentenceChunk = overlapWords;
          }
        }
        
        sentenceChunk += ' ' + sentence;
        
        // If we've exceeded chunk size, push it
        if (sentenceChunk.length >= chunkSize) {
          chunks.push(sentenceChunk.trim());
          // Reset with overlap
          const words = sentenceChunk.split(' ');
          const overlapWords = words.slice(Math.max(0, words.length - overlap / 10)).join(' ');
          sentenceChunk = overlapWords;
        }
      }
      
      // Add any remaining content
      if (sentenceChunk && sentenceChunk.length > overlap / 5) {
        currentChunk = sentenceChunk;
      }
    }
    // If paragraph fits in a chunk, add it
    else if ((currentChunk + ' ' + paragraph).length <= chunkSize) {
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
  
  return chunks.filter(chunk => chunk.length > 0);
}
