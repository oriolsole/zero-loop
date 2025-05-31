import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple encryption/decryption using Web Crypto API
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = Deno.env.get('GOOGLE_OAUTH_ENCRYPTION_KEY') || 'default-key-material-change-in-production';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial.padEnd(32, '0').slice(0, 32));
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptToken(token: string): Promise<string> {
  if (!token) return '';
  
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

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
        // Redirect back to tools page with error
        const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com') || 'http://localhost:5173'}/tools?error=${encodeURIComponent(error)}`;
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': redirectUrl,
            ...corsHeaders 
          }
        });
      }

      if (!code) {
        console.error('❌ No authorization code received');
        const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com') || 'http://localhost:5173'}/tools?error=no_code`;
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': redirectUrl,
            ...corsHeaders 
          }
        });
      }

      const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
      
      if (!clientId || !clientSecret) {
        console.error('❌ Google OAuth credentials not configured');
        const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com') || 'http://localhost:5173'}/tools?error=config_error`;
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': redirectUrl,
            ...corsHeaders 
          }
        });
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
        const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com') || 'http://localhost:5173'}/tools?error=token_exchange_failed`;
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': redirectUrl,
            ...corsHeaders 
          }
        });
      }

      const tokenData = await tokenResponse.json();
      
      console.log('✅ Token exchange successful:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope
      });

      // We need to get the user ID - for now, we'll redirect with tokens in URL params
      // In a real implementation, you'd want to maintain state to associate with the correct user
      try {
        // Create Supabase client
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // For now, we'll assume the user is the most recently authenticated user
        // In production, you'd want to maintain proper state linking
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1);

        if (profileError || !profiles || profiles.length === 0) {
          console.error('❌ Could not find user profile:', profileError);
          const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com') || 'http://localhost:5173'}/tools?error=user_not_found`;
          return new Response(null, {
            status: 302,
            headers: { 
              'Location': redirectUrl,
              ...corsHeaders 
            }
          });
        }

        const userId = profiles[0].id;

        // Calculate expiration time
        const expiresInSeconds = tokenData.expires_in || 3600;
        const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();

        console.log('🔐 Encrypting and storing tokens...');
        
        // Encrypt tokens before storage
        const encryptedAccessToken = await encryptToken(tokenData.access_token);
        const encryptedRefreshToken = tokenData.refresh_token ? await encryptToken(tokenData.refresh_token) : null;

        // Store encrypted tokens
        const { data, error: upsertError } = await supabase
          .from('google_oauth_tokens')
          .upsert({
            user_id: userId,
            access_token: encryptedAccessToken,
            refresh_token: encryptedRefreshToken,
            expires_at: expiresAt,
            scope: tokenData.scope || '',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
          .select();

        if (upsertError) {
          console.error('❌ Failed to store tokens:', upsertError);
          const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com') || 'http://localhost:5173'}/tools?error=storage_failed`;
          return new Response(null, {
            status: 302,
            headers: { 
              'Location': redirectUrl,
              ...corsHeaders 
            }
          });
        }

        console.log('✅ Tokens stored successfully, redirecting to tools page');
        
        // Redirect back to tools page with success
        const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com') || 'http://localhost:5173'}/tools?success=google_connected`;
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': redirectUrl,
            ...corsHeaders 
          }
        });

      } catch (error) {
        console.error('❌ Error storing tokens:', error);
        const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com') || 'http://localhost:5173'}/tools?error=processing_failed`;
        return new Response(null, {
          status: 302,
          headers: { 
            'Location': redirectUrl,
            ...corsHeaders 
          }
        });
      }
    }

    // Handle POST request (store tokens from authenticated frontend - keep for compatibility)
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
      const expiresInSeconds = tokens.expires_in || 3600;
      const expiresAt = tokens.expires_at || new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();

      console.log('🔐 Encrypting tokens...');
      
      // Encrypt tokens before storage
      const encryptedAccessToken = await encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;

      console.log('💾 Storing encrypted tokens for user:', user_id);

      // Store encrypted tokens using upsert
      const { data, error: upsertError } = await supabase
        .from('google_oauth_tokens')
        .upsert({
          user_id: user_id,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: expiresAt,
          scope: tokens.scope || '',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (upsertError) {
        console.error('❌ Failed to store tokens:', upsertError);
        throw new Error(`Failed to store authentication tokens: ${upsertError.message}`);
      }

      console.log('✅ Successfully stored encrypted tokens via POST');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Google APIs connected successfully'
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

// Export decryptToken function for use in other edge functions
export { decryptToken };

async function decryptToken(encryptedToken: string): Promise<string> {
  if (!encryptedToken) return '';
  
  const key = await getEncryptionKey();
  
  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedToken).split('').map(char => char.charCodeAt(0))
  );
  
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
