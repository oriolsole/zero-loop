
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    
    if (!clientId) {
      throw new Error('Google OAuth client ID not configured');
    }

    // Parse request body to get custom scopes
    let requestedScopes = ['https://www.googleapis.com/auth/drive']; // Default scope
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.scopes && Array.isArray(body.scopes)) {
          requestedScopes = body.scopes;
          console.log('🔄 Custom scopes requested:', requestedScopes);
        }
      } catch (e) {
        console.log('📋 No custom scopes provided, using defaults');
      }
    }

    // Generate state parameter for security
    const state = crypto.randomUUID();
    
    // Join scopes with spaces for Google OAuth
    const scopeString = requestedScopes.join(' ');
    console.log('🔗 Final scope string:', scopeString);
    
    // Google OAuth 2.0 authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopeString);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    console.log('✅ OAuth URL generated with scopes:', scopeString);

    return new Response(
      JSON.stringify({
        success: true,
        authUrl: authUrl.toString(),
        state: state,
        requestedScopes: requestedScopes
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Google OAuth initiate error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
