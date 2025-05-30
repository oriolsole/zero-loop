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
        expires_in: tokenData.expires_in || 3600,
        scope: tokenData.scope || 'https://www.googleapis.com/auth/drive',
        token_type: tokenData.token_type || 'Bearer'
      };
      
      // Enhanced HTML with better debugging and error handling
      const successHtml = `
        <html>
          <body>
            <script>
              console.log('🔄 Popup: Starting token transmission...');
              console.log('🌐 Popup: Current origin:', window.location.origin);
              console.log('🪟 Popup: Opener exists:', !!window.opener);
              console.log('🪟 Popup: Opener closed:', window.opener ? window.opener.closed : 'N/A');
              
              let tokensSent = false;
              let windowClosed = false;
              let messageAttempts = 0;
              const maxAttempts = 5;
              
              function attemptSendMessage() {
                messageAttempts++;
                console.log(\`📤 Popup: Attempt \${messageAttempts}/\${maxAttempts} to send tokens...\`);
                
                try {
                  if (window.opener && !window.opener.closed) {
                    console.log('📨 Popup: Sending message to parent...');
                    window.opener.postMessage({
                      type: 'google-oauth-success',
                      tokens: ${JSON.stringify(processedTokens)}
                    }, window.location.origin);
                    console.log('✅ Popup: Message sent successfully');
                    tokensSent = true;
                    
                    // Listen for confirmation from parent
                    const messageHandler = (event) => {
                      console.log('📨 Popup: Received message from parent:', event.data);
                      
                      if (event.origin !== window.location.origin) {
                        console.log('⚠️ Popup: Ignoring message from different origin');
                        return;
                      }
                      
                      if (event.data.type === 'oauth-close-popup') {
                        console.log('✅ Popup: Received close confirmation from parent');
                        window.removeEventListener('message', messageHandler);
                        if (!windowClosed) {
                          windowClosed = true;
                          window.close();
                        }
                      }
                    };
                    
                    window.addEventListener('message', messageHandler);
                    
                    // Fallback: close after 15 seconds if no confirmation received
                    setTimeout(() => {
                      if (!windowClosed) {
                        console.log('⚠️ Popup: No confirmation received, closing anyway');
                        window.removeEventListener('message', messageHandler);
                        windowClosed = true;
                        window.close();
                      }
                    }, 15000);
                    
                  } else {
                    console.error('❌ Popup: No opener window found or opener was closed');
                    if (messageAttempts < maxAttempts) {
                      console.log(\`🔄 Popup: Retrying in 1 second... (\${messageAttempts}/\${maxAttempts})\`);
                      setTimeout(attemptSendMessage, 1000);
                    } else {
                      console.error('❌ Popup: Max attempts reached, giving up');
                      document.body.innerHTML = '<p>Authentication completed, but failed to communicate with parent window. Please close this window and try again.</p>';
                    }
                  }
                } catch (error) {
                  console.error('❌ Popup: Error posting message:', error);
                  if (messageAttempts < maxAttempts) {
                    console.log(\`🔄 Popup: Retrying due to error... (\${messageAttempts}/\${maxAttempts})\`);
                    setTimeout(attemptSendMessage, 1000);
                  } else {
                    console.error('❌ Popup: Max attempts reached after errors');
                    document.body.innerHTML = '<p>Authentication completed. Please close this window.</p>';
                  }
                }
              }
              
              // Start the message sending process
              attemptSendMessage();
            </script>
            <p>Authentication successful! Completing setup...</p>
            <p><small>Debug: Processing tokens and communicating with parent window...</small></p>
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
