
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { extract as extractPdfText } from "https://deno.land/x/pdfjs@v0.1.1/mod.ts";

// Required environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const body = await req.json();
    
    // For regular text content
    if (body.contentType === 'text') {
      const {
        title,
        content,
        metadata = {},
        domain_id,
        source_url,
        chunk_size = 1000,
        overlap = 100
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

      // Initialize Supabase client with service role key for admin access
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Split content into chunks
      const chunks = chunkText(content, chunk_size, overlap);
      
      console.log(`Split content into ${chunks.length} chunks`);
      
      // Get embeddings for all chunks in a single batch request
      let embeddings: number[][] = [];
      
      try {
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
        
        embeddings = embeddingsData.data.map((item: any) => item.embedding);
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
      
      console.log(`Generated ${embeddings.length} embeddings`);
      
      // Insert chunks with embeddings into the database
      const insertPromises = chunks.map((chunk, i) => {
        return supabase.from('knowledge_chunks').insert({
          title,
          content: chunk,
          embedding: embeddings[i],
          domain_id,
          source_url,
          metadata: {
            ...metadata,
            chunk_index: i,
            total_chunks: chunks.length
          }
        });
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
      
      console.log(`Successfully inserted ${chunks.length} chunks into the knowledge base`);
      
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
    // For file uploads (PDF, images)
    else if (body.contentType === 'file') {
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

      // Initialize Supabase client with service role key for admin access
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Decode the base64 file
      const binaryData = Uint8Array.from(atob(fileBase64.split(',')[1]), c => c.charCodeAt(0));

      // Generate a unique file path
      const timestamp = new Date().getTime();
      const filePath = `${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      let extractedText = '';
      
      // Extract text according to file type
      if (fileType.includes('pdf')) {
        try {
          // Convert Uint8Array to ArrayBuffer for PDF.js
          const buffer = binaryData.buffer;
          const pdfData = new Uint8Array(buffer);
          
          // Extract text from PDF
          extractedText = await extractPdfText(pdfData);
          console.log(`Extracted ${extractedText.length} characters from PDF`);
        } catch (error) {
          console.error('Error extracting PDF text:', error);
          extractedText = `[Failed to extract PDF text: ${error.message}]`;
        }
      } else if (fileType.includes('image')) {
        // For images, we'll use the OpenAI API to generate a description
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4-vision-preview',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: 'Analyze this image and provide a detailed description of what you see. Include any visible text.' },
                    {
                      type: 'image_url',
                      image_url: {
                        url: fileBase64
                      }
                    }
                  ]
                }
              ],
              max_tokens: 1000
            })
          });

          const data = await response.json();
          if (data.choices && data.choices[0] && data.choices[0].message) {
            extractedText = data.choices[0].message.content || '';
            console.log(`Generated ${extractedText.length} characters of image description`);
          }
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
      
      // Get embeddings for all chunks in a single batch request
      let embeddings: number[][] = [];
      
      if (chunks.length > 0) {
        try {
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
          
          embeddings = embeddingsData.data.map((item: any) => item.embedding);
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
      
      // For each chunk, store in the database
      const insertPromises = chunks.map((chunk, i) => {
        return supabase.from('knowledge_chunks').insert({
          title,
          content: chunk,
          embedding: embeddings[i],
          domain_id,
          source_url,
          file_path: filePath,
          original_file_type: fileType,
          file_size: fileSize,
          ocr_processed: true,
          metadata: {
            ...metadata,
            chunk_index: i,
            total_chunks: chunks.length,
            file_name: fileName,
            public_url: publicUrl
          }
        });
      });
      
      // If no chunks were created (e.g., empty PDF), create a placeholder entry
      if (chunks.length === 0) {
        insertPromises.push(
          supabase.from('knowledge_chunks').insert({
            title,
            content: `[File: ${fileName}]`,
            domain_id,
            source_url,
            file_path: filePath,
            original_file_type: fileType,
            file_size: fileSize,
            ocr_processed: true,
            metadata: {
              ...metadata,
              file_name: fileName,
              public_url: publicUrl
            }
          })
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
    else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid content type' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error processing knowledge upload:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to process upload',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Split text into chunks with overlap
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
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
