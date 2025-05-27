
import { corsHeaders } from "./cors.ts";
import { generateEmbeddings } from "./embeddings.ts";
import { chunkText } from "./textChunker.ts";
import { isValidUUID } from "./utils.ts";

/**
 * Process text content upload with user authentication and optional progress tracking
 */
export async function handleTextContent(
  body: any, 
  supabase: any, 
  user: { id: string; email?: string },
  uploadId?: string
) {
  const {
    title,
    content,
    metadata = {},
    domain_id,
    source_url,
    chunk_size = 300,
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

  // Update progress if tracking
  if (uploadId) {
    await supabase.from('upload_progress').update({
      progress: 10,
      message: 'Splitting text into chunks...',
      updated_at: new Date().toISOString()
    }).eq('id', uploadId);
  }

  // Split content into smaller chunks
  const chunks = chunkText(content, chunk_size, overlap);
  
  console.log(`Split content into ${chunks.length} chunks for user ${user.id}`);
  
  // Update progress
  if (uploadId) {
    await supabase.from('upload_progress').update({
      progress: 30,
      message: `Generating embeddings for ${chunks.length} chunks...`,
      updated_at: new Date().toISOString()
    }).eq('id', uploadId);
  }
  
  // Get embeddings for all chunks with improved error handling
  let embeddings: number[][] = [];
  
  try {
    // Process embeddings in batches to avoid memory issues
    const BATCH_SIZE = 10;
    embeddings = [];
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE);
      console.log(`Processing embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);
      
      const batchEmbeddings = await generateEmbeddings(batchChunks);
      embeddings.push(...batchEmbeddings);
      
      // Update progress during embedding generation
      if (uploadId) {
        const progress = 30 + Math.floor(((i + BATCH_SIZE) / chunks.length) * 40);
        await supabase.from('upload_progress').update({
          progress: Math.min(progress, 70),
          message: `Generated embeddings for ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`,
          updated_at: new Date().toISOString()
        }).eq('id', uploadId);
      }
    }
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
  
  // Update progress
  if (uploadId) {
    await supabase.from('upload_progress').update({
      progress: 80,
      message: 'Storing chunks in database...',
      updated_at: new Date().toISOString()
    }).eq('id', uploadId);
  }
  
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
  
  // Insert chunks with embeddings into the database in batches
  const INSERT_BATCH_SIZE = 5; // Smaller batches for database inserts
  
  for (let i = 0; i < chunks.length; i += INSERT_BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + INSERT_BATCH_SIZE);
    const batchEmbeddings = embeddings.slice(i, i + INSERT_BATCH_SIZE);
    
    const insertObjects = batchChunks.map((chunk, batchIndex) => ({
      ...baseInsertObject,
      content: chunk,
      embedding: batchEmbeddings[batchIndex],
      metadata: {
        ...enhancedMetadata,
        chunk_index: i + batchIndex,
        total_chunks: chunks.length
      }
    }));
    
    const { error } = await supabase.from('knowledge_chunks').insert(insertObjects);
    
    if (error) {
      console.error(`Error inserting text batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1}:`, error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to insert some chunks',
          details: error
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update progress during batch insertion
    if (uploadId) {
      const progress = 80 + Math.floor(((i + INSERT_BATCH_SIZE) / chunks.length) * 15);
      await supabase.from('upload_progress').update({
        progress: Math.min(progress, 95),
        message: `Stored ${Math.min(i + INSERT_BATCH_SIZE, chunks.length)}/${chunks.length} chunks`,
        updated_at: new Date().toISOString()
      }).eq('id', uploadId);
    }
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
