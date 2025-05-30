
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

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
    const url = new URL(req.url);
    
    // Handle GET request (OAuth redirect from Google)
    if (req.method === 'GET') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        return new Response(
          `<html><body><script>window.close();</script><p>Authentication failed: ${error}</p></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured');
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        throw new Error('Failed to exchange code for tokens');
      }

      const tokenData = await tokenResponse.json();
      
      // Return HTML that sends tokens to parent window
      const successHtml = `
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'google-oauth-success',
                tokens: ${JSON.stringify(tokenData)}
              }, window.location.origin);
              window.close();
            </script>
            <p>Authentication successful! This window will close automatically.</p>
          </body>
        </html>
      `;
      
      return new Response(successHtml, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Handle POST request (store tokens from authenticated frontend)
    if (req.method === 'POST') {
      const { tokens, user_id } = await req.json();

      if (!tokens || !user_id) {
        throw new Error('Missing tokens or user_id');
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Calculate expiration time
      const expiresAt = tokens.expires_at || new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

      // Store or update tokens
      const { error: insertError } = await supabase
        .from('google_oauth_tokens')
        .upsert({
          user_id: user_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          scope: tokens.scope || 'https://www.googleapis.com/auth/drive',
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Failed to store tokens:', insertError);
        throw new Error('Failed to store authentication tokens');
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Google Drive connected successfully'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }),
      { 
        status: 405,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    
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
