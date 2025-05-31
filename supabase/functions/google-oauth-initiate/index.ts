
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('📥 Initiating Google OAuth...');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    
    if (!clientId) {
      console.error('❌ Google OAuth client ID not configured');
      throw new Error('Google OAuth client ID not configured');
    }

    // Parse request body to get custom scopes and user ID
    let requestedScopes = ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']; // Default scopes
    let userId = null;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.scopes && Array.isArray(body.scopes)) {
          requestedScopes = body.scopes;
          console.log('🔄 Custom scopes requested:', requestedScopes);
        }
        if (body.userId) {
          userId = body.userId;
          console.log('👤 User ID provided:', userId);
        }
      } catch (e) {
        console.log('📋 Using default scopes and no user ID');
      }
    }

    // Generate state parameter with user ID for security
    const stateData = {
      random: crypto.randomUUID(),
      userId: userId,
      timestamp: Date.now()
    };
    const state = btoa(JSON.stringify(stateData));
    
    // Join scopes with spaces for Google OAuth
    const scopeString = requestedScopes.join(' ');
    console.log('🔗 Final scope string:', scopeString);
    console.log('🔐 State with user context:', stateData);
    
    // Get the correct redirect URI
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`;
    console.log('🔗 Using redirect URI:', redirectUri);
    
    // Google OAuth 2.0 authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopeString);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    console.log('✅ OAuth URL generated with user context');
    console.log('🔗 Final OAuth URL:', authUrl.toString());

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
    console.error('❌ Google OAuth initiate error:', error);
    
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
