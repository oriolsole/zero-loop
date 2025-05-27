
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { handleTextContent } from "./textProcessor.ts";
import { handleFileContent } from "./fileProcessor.ts";
import { createSupabaseClient } from "./supabaseClient.ts";

// JWT payload interface
interface JWTPayload {
  sub: string; // user_id
  email?: string;
  exp: number;
  iat: number;
}

// Function to decode JWT payload (without signature verification for internal use)
function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode the payload (second part)
    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Background processing function for large files with timeout protection
async function processInBackground(
  body: any,
  supabase: any,
  user: { id: string; email?: string },
  uploadId: string
) {
  // Set a timeout for background processing to prevent infinite execution
  const BACKGROUND_TIMEOUT = 8 * 60 * 1000; // 8 minutes max
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Background processing timeout')), BACKGROUND_TIMEOUT);
  });
  
  try {
    console.log(`Starting background processing for upload ${uploadId}`);
    
    // Update progress to indicate background processing started
    await supabase.from('upload_progress').upsert({
      id: uploadId,
      user_id: user.id,
      status: 'processing',
      progress: 5,
      message: 'Starting background processing...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    let result;
    
    // Race between actual processing and timeout
    const processingPromise = (async () => {
      // Process based on content type
      if (body.contentType === 'text') {
        return await handleTextContent(body, supabase, user, uploadId);
      } else if (body.contentType === 'file') {
        return await handleFileContent(body, supabase, user, uploadId);
      } else {
        throw new Error('Invalid content type');
      }
    })();
    
    result = await Promise.race([processingPromise, timeoutPromise]);

    // Update final status
    const finalStatus = result.ok ? 'completed' : 'failed';
    const finalMessage = result.ok ? 'Processing completed successfully' : 'Processing failed';
    
    await supabase.from('upload_progress').update({
      status: finalStatus,
      progress: result.ok ? 100 : 0,
      message: finalMessage,
      updated_at: new Date().toISOString()
    }).eq('id', uploadId);

    console.log(`Background processing completed for upload ${uploadId} with status: ${finalStatus}`);
    
  } catch (error) {
    console.error(`Background processing failed for upload ${uploadId}:`, error);
    
    // Update error status
    await supabase.from('upload_progress').update({
      status: 'failed',
      progress: 0,
      message: `Background processing failed: ${error.message}`,
      updated_at: new Date().toISOString()
    }).eq('id', uploadId);
  }
}

// Check if content should be processed in background with lower thresholds
function shouldProcessInBackground(body: any): boolean {
  // Lowered thresholds to catch more resource-intensive operations
  const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB (reduced from 5MB)
  const LARGE_TEXT_THRESHOLD = 500 * 1024; // 500KB (reduced from 1MB)
  
  // Always process PDFs in background due to their resource-intensive nature
  if (body.contentType === 'file' && body.fileType && body.fileType.includes('pdf')) {
    console.log('PDF detected - forcing background processing');
    return true;
  }
  
  if (body.contentType === 'file' && body.fileSize) {
    return body.fileSize > LARGE_FILE_THRESHOLD;
  }
  
  if (body.contentType === 'text' && body.content) {
    const textSize = new TextEncoder().encode(body.content).length;
    return textSize > LARGE_TEXT_THRESHOLD;
  }
  
  return false;
}

// Generate unique upload ID
function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Serve the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract Authorization header
    const authHeader = req.headers.get('Authorization');
    const authToken = authHeader?.replace('Bearer ', '');
    
    console.log('Auth header present:', !!authHeader);
    console.log('Auth token extracted:', !!authToken);
    
    if (!authToken) {
      console.error('No auth token provided');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required - no token provided' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Decode JWT to extract user information
    const jwtPayload = decodeJWTPayload(authToken);
    
    if (!jwtPayload) {
      console.error('Failed to decode JWT token');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid authentication token' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (jwtPayload.exp < now) {
      console.error('JWT token expired');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication token expired' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('JWT decoded successfully for user:', jwtPayload.sub);

    // Get request body
    const body = await req.json();

    // Initialize Supabase client with auth token
    const supabase = createSupabaseClient(authToken);

    // Create user object from JWT payload
    const user = {
      id: jwtPayload.sub,
      email: jwtPayload.email
    };

    // Check if content should be processed in background
    const useBackgroundProcessing = shouldProcessInBackground(body);
    
    if (useBackgroundProcessing) {
      console.log('Resource-intensive content detected, using background processing');
      
      // Generate unique upload ID for tracking
      const uploadId = generateUploadId();
      
      // Start background processing with timeout protection
      EdgeRuntime.waitUntil(
        processInBackground(body, supabase, user, uploadId)
      );
      
      // Return immediate response with upload ID for tracking
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Upload started in background',
          uploadId,
          backgroundProcessing: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Process immediately for small content with resource limits
      console.log('Small content detected, processing immediately');
      
      // Set a shorter timeout for immediate processing
      const IMMEDIATE_TIMEOUT = 25000; // 25 seconds
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.error('Immediate processing timeout - should have been background');
          reject(new Error('Processing timeout - content too large for immediate processing'));
        }, IMMEDIATE_TIMEOUT);
      });
      
      const processingPromise = (async () => {
        // Process based on content type
        if (body.contentType === 'text') {
          return await handleTextContent(body, supabase, user);
        } 
        else if (body.contentType === 'file') {
          return await handleFileContent(body, supabase, user);
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
      })();
      
      try {
        return await Promise.race([processingPromise, timeoutPromise]);
      } catch (error) {
        if (error.message.includes('timeout')) {
          // If timeout occurs, fallback to background processing
          console.log('Immediate processing timed out, falling back to background processing');
          
          const uploadId = generateUploadId();
          EdgeRuntime.waitUntil(
            processInBackground(body, supabase, user, uploadId)
          );
          
          return new Response(
            JSON.stringify({ 
              success: true,
              message: 'Processing moved to background due to timeout',
              uploadId,
              backgroundProcessing: true
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        throw error;
      }
    }
  } catch (error) {
    console.error('Error processing knowledge upload:', error);
    
    // Check if this is a WORKER_LIMIT error and suggest background processing
    if (error.message.includes('WORKER_LIMIT') || error.message.includes('compute resources')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Content too large for immediate processing - please try again (it will be processed in background)',
          code: 'WORKER_LIMIT_FALLBACK'
        }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
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

// Handle function shutdown
addEventListener('beforeunload', (ev) => {
  console.log('Function shutdown due to:', ev.detail?.reason);
});
