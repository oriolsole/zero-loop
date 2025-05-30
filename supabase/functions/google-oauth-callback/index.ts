
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
        const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Error</title>
</head>
<body>
  <h1>Authentication Failed</h1>
  <p>Error: ${error}</p>
  <script>
    console.log('🚨 OAuth error detected:', '${error}');
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'google-oauth-error',
        error: '${error}'
      }, window.location.origin);
    }
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>`;
        
        return new Response(errorHtml, {
          headers: { 
            'Content-Type': 'text/html; charset=utf-8',
            ...corsHeaders 
          }
        });
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
        expires_in: tokenData.expires_in || 3600,
        scope: tokenData.scope || 'https://www.googleapis.com/auth/drive',
        token_type: tokenData.token_type || 'Bearer'
      };
      
      // Create properly structured HTML with immediate message sending
      const successHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Success</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      text-align: center; 
      padding: 20px; 
      background: #f5f5f5; 
    }
    .container { 
      max-width: 400px; 
      margin: 0 auto; 
      background: white; 
      padding: 20px; 
      border-radius: 8px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
    }
    .success { color: #10b981; }
    .loading { color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="success">✅ Authentication Successful!</h1>
    <p class="loading">Completing setup...</p>
    <p><small>This window will close automatically.</small></p>
  </div>
  
  <script>
    console.log('🔄 Popup: Starting token transmission...');
    console.log('🌐 Popup: Window origin:', window.location.origin);
    console.log('🪟 Popup: Opener exists:', !!window.opener);
    console.log('🪟 Popup: Opener closed:', window.opener ? window.opener.closed : 'no opener');
    
    // The tokens to send to parent
    const tokens = ${JSON.stringify(processedTokens)};
    console.log('📦 Popup: Prepared tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope
    });
    
    // Create the message with exact structure expected by parent
    const messageData = {
      type: 'google-oauth-success',
      tokens: tokens
    };
    
    console.log('📤 Popup: Final message structure:', messageData);
    
    // Function to send message to parent
    function sendMessageToParent() {
      try {
        if (!window.opener) {
          console.error('❌ Popup: No opener window found');
          return false;
        }
        
        if (window.opener.closed) {
          console.error('❌ Popup: Opener window is closed');
          return false;
        }
        
        console.log('📤 Popup: Sending message to parent...');
        window.opener.postMessage(messageData, window.location.origin);
        console.log('✅ Popup: Message sent successfully');
        return true;
      } catch (error) {
        console.error('❌ Popup: Error sending message:', error);
        return false;
      }
    }
    
    // Send message immediately when page loads
    let messageSent = false;
    
    // Try to send message as soon as possible
    if (sendMessageToParent()) {
      messageSent = true;
      console.log('✅ Popup: Initial message send successful');
      
      // Listen for close confirmation from parent
      window.addEventListener('message', function(event) {
        console.log('📨 Popup: Received message from parent:', event.data);
        
        if (event.origin !== window.location.origin) {
          console.log('⚠️ Popup: Ignoring message from different origin');
          return;
        }
        
        if (event.data && event.data.type === 'oauth-close-popup') {
          console.log('✅ Popup: Received close confirmation, closing window');
          window.close();
        }
      });
      
      // Fallback: close after 10 seconds if no confirmation
      setTimeout(() => {
        console.log('⏰ Popup: Timeout reached, closing window');
        window.close();
      }, 10000);
      
    } else {
      console.error('❌ Popup: Failed to send initial message');
      
      // Retry mechanism - try again after a short delay
      setTimeout(() => {
        console.log('🔄 Popup: Retrying message send...');
        if (sendMessageToParent()) {
          messageSent = true;
          console.log('✅ Popup: Retry message send successful');
          setTimeout(() => window.close(), 2000);
        } else {
          console.error('❌ Popup: Retry also failed');
          document.querySelector('.container').innerHTML = 
            '<h1>⚠️ Communication Error</h1><p>Please close this window and try again.</p>';
        }
      }, 1000);
    }
    
    // Backup mechanism - try sending on window load
    window.addEventListener('load', function() {
      if (!messageSent) {
        console.log('🔄 Popup: Trying message send on window load...');
        if (sendMessageToParent()) {
          messageSent = true;
          setTimeout(() => window.close(), 2000);
        }
      }
    });
    
    // Final backup - try sending after DOM is fully ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        if (!messageSent) {
          console.log('🔄 Popup: Trying message send on DOM ready...');
          if (sendMessageToParent()) {
            messageSent = true;
            setTimeout(() => window.close(), 2000);
          }
        }
      });
    }
  </script>
</body>
</html>`;
      
      console.log('📤 Popup: Returning HTML response with Content-Type: text/html');
      
      return new Response(successHtml, {
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          ...corsHeaders 
        }
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
      const expiresInSeconds = tokens.expires_in || 3600;
      const expiresAt = tokens.expires_at || new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();

      console.log('📅 Token expiration details:', {
        expiresInSeconds,
        expiresAt,
        hasExistingExpiresAt: !!tokens.expires_at
      });

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

      console.log('✅ Successfully stored and verified encrypted tokens for user:', user_id);

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
