
import { corsHeaders } from "./cors.ts";
import { generateEmbeddings } from "./embeddings.ts";
import { chunkText } from "./textChunker.ts";
import { extractTextFromImage } from "./imageProcessor.ts";
import { extractTextFromPDF, analyzePDFContent } from "./pdfProcessor.ts";
import { isValidUUID } from "./utils.ts";

/**
 * Process file upload (PDF, images, etc) with improved user handling
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
    chunk_size = 400, // Much smaller default chunk size
    overlap = 50
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
  
  // Get user from auth context
  const authHeader = supabase.auth.getUser ? 
    await supabase.auth.getUser() : 
    { data: { user: null }, error: null };
    
  const user = authHeader.data?.user;
  if (!user) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Authentication required' 
      }),
      { 
        status: 401, 
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
  let processingMethod = 'unknown';
  
  // Extract text according to file type
  if (fileType.includes('pdf')) {
    try {
      console.log(`Processing PDF: ${fileName}`);
      
      // Analyze PDF content to determine processing strategy
      const analysis = analyzePDFContent(binaryData);
      console.log(`PDF analysis for ${fileName}:`, analysis);
      
      extractedText = await extractTextFromPDF(fileBase64, fileName);
      processingMethod = analysis.hasText ? 'pdf-text-extraction' : 'pdf-ocr';
      
      if (!extractedText || extractedText.trim().length === 0) {
        extractedText = `[PDF file: ${fileName}. No readable content could be extracted.]`;
        processingMethod = 'pdf-failed';
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      extractedText = `[PDF file: ${fileName}. Processing failed: ${error.message}]`;
      processingMethod = 'pdf-error';
    }
  } else if (fileType.includes('image')) {
    try {
      console.log(`Processing image: ${fileName}`);
      extractedText = await extractTextFromImage(fileBase64);
      processingMethod = 'image-ocr';
    } catch (error) {
      console.error('Error analyzing image with OpenAI:', error);
      extractedText = `[Image file: ${fileName}. Analysis failed: ${error.message}]`;
      processingMethod = 'image-error';
    }
  } else {
    extractedText = `[File: ${fileName}. File type not supported for text extraction.]`;
    processingMethod = 'unsupported';
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
  
  // Split extracted text into much smaller chunks
  const chunks = extractedText ? chunkText(extractedText, chunk_size, overlap) : [];
  
  console.log(`Split extracted content into ${chunks.length} chunks using ${processingMethod}`);
  
  // Get embeddings for all chunks with improved error handling
  let embeddings: number[][] = [];
  
  if (chunks.length > 0) {
    try {
      console.log(`Generating embeddings for ${chunks.length} chunks with conservative batching...`);
      embeddings = await generateEmbeddings(chunks);
      console.log(`Successfully generated ${embeddings.length} embeddings`);
    } catch (error) {
      console.error('Error generating embeddings:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate embeddings for file content',
          details: error.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  }
  
  // Prepare the base insert object with required user_id
  const baseInsertObject: Record<string, any> = {
    title,
    content: '',  // Will be overridden for each chunk
    user_id: user.id, // Include user_id for RLS compliance
    file_path: filePath,
    original_file_type: fileType,
    file_size: fileSize,
    ocr_processed: processingMethod.includes('ocr') || processingMethod.includes('pdf'),
    source_url,
    metadata: {
      ...metadata,
      file_name: fileName,
      public_url: publicUrl,
      processing_method: processingMethod,
      extraction_length: extractedText ? extractedText.length : 0
    }
  };
  
  // Only add domain_id if it's provided and a valid UUID
  if (domain_id && isValidUUID(domain_id)) {
    baseInsertObject.domain_id = domain_id;
  } else if (domain_id) {
    console.warn(`Invalid domain ID format: ${domain_id}. Setting to null.`);
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
  
  // If no chunks were created (e.g., empty file), create a placeholder entry
  if (chunks.length === 0) {
    const placeholderInsertObject = {
      ...baseInsertObject,
      content: extractedText || `[File: ${fileName}]`,
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
  
  console.log(`Successfully processed file ${fileName} using ${processingMethod} and inserted ${chunks.length} chunks`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Uploaded file ${fileName} and processed ${chunks.length} chunks successfully`,
      publicUrl,
      processingMethod,
      extractedLength: extractedText ? extractedText.length : 0
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
