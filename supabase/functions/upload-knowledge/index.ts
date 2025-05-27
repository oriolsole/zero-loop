
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

// Background processing function for large files
async function processInBackground(
  body: any,
  supabase: any,
  user: { id: string; email?: string },
  uploadId: string
) {
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
    
    // Process based on content type
    if (body.contentType === 'text') {
      result = await handleTextContent(body, supabase, user, uploadId);
    } else if (body.contentType === 'file') {
      result = await handleFileContent(body, supabase, user, uploadId);
    } else {
      throw new Error('Invalid content type');
    }

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

// Check if content should be processed in background
function shouldProcessInBackground(body: any): boolean {
  // File size thresholds (in bytes)
  const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB
  const LARGE_TEXT_THRESHOLD = 1 * 1024 * 1024; // 1MB
  
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
      console.log('Large content detected, using background processing');
      
      // Generate unique upload ID for tracking
      const uploadId = generateUploadId();
      
      // Start background processing
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
      // Process immediately for small content
      console.log('Small content detected, processing immediately');
      
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

// Handle function shutdown
addEventListener('beforeunload', (ev) => {
  console.log('Function shutdown due to:', ev.detail?.reason);
});
