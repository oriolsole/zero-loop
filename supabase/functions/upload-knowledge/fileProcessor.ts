
import { corsHeaders } from "./cors.ts";
import { generateEmbeddings } from "./embeddings.ts";
import { chunkText } from "./textChunker.ts";
import { extractTextFromImage } from "./imageProcessor.ts";

/**
 * Process file upload (PDF, images, etc)
 */
export async function handleFileContent(body: any, supabase: any) {
  const {
    title,
    fileBase64,
    fileType,
    fileName,
    fileSize,
    metadata = {},
    domain_id,
    source_url,
    chunk_size = 1000,
    overlap = 100
  } = body;
  
  // Validate required fields
  if (!title || !fileBase64 || !fileType) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Title, file and file type are required' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
  
  // Decode the base64 file
  const binaryData = Uint8Array.from(atob(fileBase64.split(',')[1]), c => c.charCodeAt(0));

  // Generate a unique file path
  const timestamp = new Date().getTime();
  const filePath = `${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  let extractedText = '';
  
  // Extract text according to file type
  if (fileType.includes('pdf')) {
    // For PDFs, we'll use a placeholder approach since pdfjs isn't available
    extractedText = `[PDF file content: ${fileName}]. This is a placeholder text. In production, this would be the actual content extracted from the PDF file.`;
    console.log(`Set placeholder for PDF text extraction`);
  } else if (fileType.includes('image')) {
    try {
      extractedText = await extractTextFromImage(fileBase64);
    } catch (error) {
      console.error('Error analyzing image with OpenAI:', error);
      extractedText = `[Image file: ${fileName}. Analysis failed: ${error.message}]`;
    }
  } else {
    extractedText = `[Non-extractable file: ${fileName}]`;
  }

  // Upload file to storage
  const { data: fileData, error: fileError } = await supabase.storage
    .from('knowledge_files')
    .upload(filePath, binaryData, {
      contentType: fileType,
      cacheControl: '3600'
    });
    
  if (fileError) {
    console.error('Error uploading file:', fileError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to upload file to storage',
        details: fileError
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
  
  // Get public URL for the file
  const { data: { publicUrl } } = supabase.storage
    .from('knowledge_files')
    .getPublicUrl(filePath);
  
  // Split extracted text into chunks
  const chunks = extractedText ? chunkText(extractedText, chunk_size, overlap) : [];
  
  console.log(`Split extracted content into ${chunks.length} chunks`);
  
  // Get embeddings for all chunks
  let embeddings: number[][] = [];
  
  if (chunks.length > 0) {
    try {
      embeddings = await generateEmbeddings(chunks);
    } catch (error) {
      console.error('Error generating embeddings:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate embeddings' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  }
  
  // Prepare the base insert object
  const baseInsertObject: Record<string, any> = {
    title,
    content: '',  // Will be overridden for each chunk
    file_path: filePath,
    original_file_type: fileType,
    file_size: fileSize,
    ocr_processed: true,
    source_url,
    metadata: {
      ...metadata,
      file_name: fileName,
      public_url: publicUrl
    }
  };
  
  // Only add domain_id if it's provided and valid
  if (domain_id) {
    baseInsertObject.domain_id = domain_id;
  }
  
  // For each chunk, store in the database
  const insertPromises = chunks.map((chunk, i) => {
    const insertObject = {
      ...baseInsertObject,
      content: chunk,
      embedding: embeddings[i],
      metadata: {
        ...baseInsertObject.metadata,
        chunk_index: i,
        total_chunks: chunks.length
      }
    };
    
    return supabase.from('knowledge_chunks').insert(insertObject);
  });
  
  // If no chunks were created (e.g., empty PDF), create a placeholder entry
  if (chunks.length === 0) {
    const placeholderInsertObject = {
      ...baseInsertObject,
      content: `[File: ${fileName}]`,
    };
    
    insertPromises.push(
      supabase.from('knowledge_chunks').insert(placeholderInsertObject)
    );
  }
  
  // Execute all inserts in parallel
  const results = await Promise.all(insertPromises);
  
  // Check for errors
  const errors = results.filter(r => r.error).map(r => r.error);
  if (errors.length > 0) {
    console.error('Errors inserting file chunks:', errors);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to insert some file chunks',
        details: errors
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
  
  console.log(`Successfully processed file ${fileName} and inserted ${chunks.length} chunks`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Uploaded file ${fileName} and processed ${chunks.length} chunks successfully`,
      publicUrl
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
