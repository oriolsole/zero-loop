
/**
 * Generate embeddings for text chunks using OpenAI
 */
export async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Generate embeddings with OpenAI
  const embeddingsResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: chunks
    })
  });

  const embeddingsData = await embeddingsResponse.json();
  
  if (!embeddingsData.data) {
    throw new Error(`OpenAI API error: ${JSON.stringify(embeddingsData.error || {})}`);
  }
  
  return embeddingsData.data.map((item: any) => item.embedding);
}
