
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
