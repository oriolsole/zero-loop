
import { corsHeaders } from "./cors.ts";
import { generateEmbeddings } from "./embeddings.ts";
import { chunkText } from "./textChunker.ts";
import { isValidUUID } from "./utils.ts";

/**
 * Process text content upload with user authentication
 */
export async function handleTextContent(body: any, supabase: any, user: { id: string; email?: string }) {
  const {
    title,
    content,
    metadata = {},
    domain_id,
    source_url,
    chunk_size = 300, // Even smaller default chunk size
    overlap = 30
  } = body;
  
  // Validate required fields
  if (!title || !content) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Title and content are required' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  console.log(`Processing text content for user: ${user.id}`);

  // Split content into smaller chunks
  const chunks = chunkText(content, chunk_size, overlap);
  
  console.log(`Split content into ${chunks.length} chunks for user ${user.id}`);
  
  // Get embeddings for all chunks with improved error handling
  let embeddings: number[][] = [];
  
  try {
    embeddings = await generateEmbeddings(chunks);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to generate embeddings',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
  
  console.log(`Generated ${embeddings.length} embeddings`);
  
  // Enhanced metadata for web content
  const enhancedMetadata = {
    ...metadata,
    source_type: source_url ? 'web' : 'text',
    processed_at: new Date().toISOString()
  };
  
  // Prepare the base insert object with required user_id
  const baseInsertObject: Record<string, any> = {
    title,
    content: '',  // Will be overridden for each chunk
    embedding: [],  // Will be overridden for each chunk
    user_id: user.id, // Include user_id for RLS compliance
    source_url,
    metadata: enhancedMetadata
  };
  
  // Only add domain_id if it's provided and a valid UUID
  if (domain_id && isValidUUID(domain_id)) {
    baseInsertObject.domain_id = domain_id;
  } else if (domain_id) {
    console.warn(`Invalid domain ID format: ${domain_id}. Setting to null.`);
  }
  
  // Insert chunks with embeddings into the database
  const insertPromises = chunks.map((chunk, i) => {
    const insertObject = {
      ...baseInsertObject,
      content: chunk,
      embedding: embeddings[i],
      metadata: {
        ...enhancedMetadata,
        chunk_index: i,
        total_chunks: chunks.length
      }
    };
    
    return supabase.from('knowledge_chunks').insert(insertObject);
  });
  
  // Execute all inserts in parallel
  const results = await Promise.all(insertPromises);
  
  // Check for errors
  const errors = results.filter(r => r.error).map(r => r.error);
  if (errors.length > 0) {
    console.error('Errors inserting chunks:', errors);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to insert some chunks',
        details: errors
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
  
  console.log(`Successfully inserted ${chunks.length} chunks into the knowledge base for user ${user.id}`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Uploaded ${chunks.length} chunks successfully` 
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
