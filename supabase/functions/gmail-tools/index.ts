
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

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

async function decryptToken(encryptedToken: string): Promise<string> {
  if (!encryptedToken) return '';
  
  const key = await getEncryptionKey();
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

// Cache for access tokens per user
const tokenCache = new Map<string, { token: string; expires: number }>();

async function getValidAccessToken(userId: string, supabase: any): Promise<string> {
  // Check cache first
  const cached = tokenCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.token;
  }

  console.log('Getting OAuth token for user:', userId);

  // Get stored OAuth tokens
  const { data: tokenData, error } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !tokenData) {
    throw new Error('Gmail not connected. Please connect your Google account in the Tools section first.');
  }

  // Decrypt the stored tokens
  console.log('🔐 Decrypting stored tokens...');
  const decryptedAccessToken = await decryptToken(tokenData.access_token);
  const decryptedRefreshToken = tokenData.refresh_token ? await decryptToken(tokenData.refresh_token) : null;

  // Check if token is still valid
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  if (expiresAt > now) {
    // Token is still valid, cache and return
    tokenCache.set(userId, {
      token: decryptedAccessToken,
      expires: expiresAt.getTime()
    });
    console.log('✅ Using existing valid OAuth token');
    return decryptedAccessToken;
  }

  // Token expired, refresh it
  if (!decryptedRefreshToken) {
    throw new Error('Gmail connection expired. Please reconnect your account in the Tools section.');
  }

  console.log('🔄 Refreshing expired OAuth token for user:', userId);

  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  // Refresh the token
  const refreshResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptedRefreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshResponse.ok) {
    const errorText = await refreshResponse.text();
    console.error('Token refresh failed:', errorText);
    throw new Error('Failed to refresh Gmail access. Please reconnect your account in the Tools section.');
  }

  const refreshData = await refreshResponse.json();
  const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000));

  // Encrypt the new access token
  const encryptedNewAccessToken = await encryptToken(refreshData.access_token);

  // Update stored tokens
  const { error: updateError } = await supabase
    .from('google_oauth_tokens')
    .update({
      access_token: encryptedNewAccessToken,
      expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Failed to update refreshed tokens:', updateError);
    throw new Error('Failed to update authentication tokens');
  }

  // Cache the new token
  tokenCache.set(userId, {
    token: refreshData.access_token,
    expires: newExpiresAt.getTime()
  });

  console.log('✅ Successfully refreshed OAuth token for user:', userId);
  return refreshData.access_token;
}

async function callGmailAPI(endpoint: string, token: string, options: any = {}) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  console.log('📧 Gmail Tools request received');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action,
      userId,
      ...parameters
    } = await req.json();

    console.log('Gmail action:', action, 'for user:', userId);

    if (!action) {
      throw new Error('Action parameter is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get valid access token (handles refresh and decryption if needed)
    const accessToken = await getValidAccessToken(userId, supabase);

    let result;

    switch (action) {
      case 'list_emails': {
        const { maxResults = 10, query = '', labelIds = [] } = parameters;
        const queryParams = new URLSearchParams({
          maxResults: maxResults.toString(),
          ...(query && { q: query }),
          ...(labelIds.length > 0 && { labelIds: labelIds.join(',') })
        });
        
        result = await callGmailAPI(`/users/me/messages?${queryParams}`, accessToken);
        
        // Get email details for each message
        if (result.messages) {
          const emails = await Promise.all(
            result.messages.slice(0, 5).map(async (msg: any) => {
              const details = await callGmailAPI(`/users/me/messages/${msg.id}`, accessToken);
              return {
                id: details.id,
                threadId: details.threadId,
                snippet: details.snippet,
                subject: details.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'No Subject',
                from: details.payload?.headers?.find((h: any) => h.name === 'From')?.value || 'Unknown',
                date: details.payload?.headers?.find((h: any) => h.name === 'Date')?.value || '',
                labelIds: details.labelIds || []
              };
            })
          );
          result.emails = emails;
        }
        break;
      }

      case 'get_email': {
        const { messageId } = parameters;
        if (!messageId) throw new Error('Message ID is required');
        
        result = await callGmailAPI(`/users/me/messages/${messageId}`, accessToken);
        break;
      }

      case 'send_email': {
        const { to, subject, body, cc, bcc } = parameters;
        if (!to || !subject) throw new Error('To and subject are required');
        
        const emailContent = [
          `To: ${to}`,
          ...(cc ? [`Cc: ${cc}`] : []),
          ...(bcc ? [`Bcc: ${bcc}`] : []),
          `Subject: ${subject}`,
          '',
          body || ''
        ].join('\n');
        
        const encodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        result = await callGmailAPI('/users/me/messages/send', accessToken, {
          method: 'POST',
          body: { raw: encodedEmail }
        });
        break;
      }

      case 'search_emails': {
        const { query } = parameters;
        if (!query) throw new Error('Search query is required');
        
        result = await callGmailAPI(`/users/me/messages?q=${encodeURIComponent(query)}`, accessToken);
        break;
      }

      case 'mark_as_read': {
        const { messageId } = parameters;
        if (!messageId) throw new Error('Message ID is required');
        
        result = await callGmailAPI(`/users/me/messages/${messageId}/modify`, accessToken, {
          method: 'POST',
          body: { removeLabelIds: ['UNREAD'] }
        });
        break;
      }

      case 'delete_email': {
        const { messageId } = parameters;
        if (!messageId) throw new Error('Message ID is required');
        
        result = await callGmailAPI(`/users/me/messages/${messageId}/trash`, accessToken, {
          method: 'POST'
        });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('✅ Gmail operation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        action: action,
        authentication_method: 'oauth'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Gmail Tools error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.message.includes('not connected') ? 
          'Connect your Google account in the Tools page' : 
          'Check your Gmail connection'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
