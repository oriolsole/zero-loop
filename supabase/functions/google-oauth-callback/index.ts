
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`📥 ${req.method} request to google-oauth-callback`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Handle GET request (OAuth redirect from Google)
    if (req.method === 'GET') {
      console.log('🔄 Processing GET request (OAuth redirect)');
      
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      console.log('📊 OAuth redirect parameters:', {
        hasCode: !!code,
        hasState: !!state,
        error
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        return new Response(
          `<html><body><script>window.opener.postMessage({type: 'google-oauth-error', error: '${error}'}, window.location.origin);window.close();</script><p>Authentication failed: ${error}</p></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      if (!code) {
        console.error('❌ No authorization code received');
        throw new Error('No authorization code received');
      }

      const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        console.error('❌ Google OAuth credentials not configured');
        throw new Error('Google OAuth credentials not configured');
      }

      console.log('🔄 Exchanging code for tokens...');

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
        console.error('❌ Token exchange failed:', errorText);
        throw new Error('Failed to exchange code for tokens');
      }

      const tokenData = await tokenResponse.json();
      
      console.log('✅ Token exchange successful:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope
      });
      
      // Handle missing fields with defaults
      const processedTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_in: tokenData.expires_in || 3600, // Default to 1 hour
        scope: tokenData.scope || 'https://www.googleapis.com/auth/drive',
        token_type: tokenData.token_type || 'Bearer'
      };
      
      // Return HTML that sends tokens to parent window
      const successHtml = `
        <html>
          <body>
            <script>
              console.log('🔄 Sending tokens to parent window...');
              try {
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'google-oauth-success',
                    tokens: ${JSON.stringify(processedTokens)}
                  }, window.location.origin);
                  console.log('✅ Tokens sent successfully');
                  setTimeout(() => window.close(), 500);
                } else {
                  console.error('❌ No opener window found');
                  document.body.innerHTML = '<p>Please close this window and try again.</p>';
                }
              } catch (error) {
                console.error('❌ Error posting message:', error);
                document.body.innerHTML = '<p>Authentication completed. Please close this window.</p>';
              }
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
      console.log('🔄 Processing POST request (token storage)');
      
      const requestBody = await req.json();
      console.log('📊 POST request body:', {
        hasTokens: !!requestBody.tokens,
        hasUserId: !!requestBody.user_id,
        userId: requestBody.user_id
      });

      const { tokens, user_id } = requestBody;

      if (!tokens || !user_id) {
        console.error('❌ Missing tokens or user_id in request');
        throw new Error('Missing tokens or user_id');
      }

      if (!tokens.access_token) {
        console.error('❌ Missing access_token in tokens');
        throw new Error('Missing access_token in tokens');
      }

      console.log('🔄 Creating Supabase client...');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Calculate expiration time - handle missing expires_in
      const expiresInSeconds = tokens.expires_in || 3600; // Default to 1 hour
      const expiresAt = tokens.expires_at || new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();

      console.log('📅 Token expiration details:', {
        expiresInSeconds,
        expiresAt,
        hasExistingExpiresAt: !!tokens.expires_at
      });

      console.log('💾 Storing tokens for user:', user_id);

      // Store or update tokens using upsert
      const { data, error: upsertError } = await supabase
        .from('google_oauth_tokens')
        .upsert({
          user_id: user_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          expires_at: expiresAt,
          scope: tokens.scope || 'https://www.googleapis.com/auth/drive',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select();

      console.log('📊 Upsert result:', {
        data,
        error: upsertError,
        hasData: !!data,
        dataLength: data?.length
      });

      if (upsertError) {
        console.error('❌ Failed to store tokens:', upsertError);
        throw new Error(`Failed to store authentication tokens: ${upsertError.message}`);
      }

      // Verify the token was stored
      console.log('🔍 Verifying token storage...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('google_oauth_tokens')
        .select('id, user_id, expires_at')
        .eq('user_id', user_id)
        .single();

      console.log('📊 Verification result:', {
        verifyData,
        verifyError,
        hasVerifyData: !!verifyData
      });

      if (verifyError) {
        console.error('❌ Failed to verify token storage:', verifyError);
        throw new Error(`Failed to verify token storage: ${verifyError.message}`);
      }

      if (!verifyData) {
        console.error('❌ Token verification failed - no data found after insert');
        throw new Error('Token was not properly stored');
      }

      console.log('✅ Successfully stored and verified tokens for user:', user_id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Google Drive connected successfully',
          tokenId: verifyData.id
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
    console.error('❌ Method not allowed:', req.method);
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
    console.error('❌ Google OAuth callback error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Check the edge function logs for more information'
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
