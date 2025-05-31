
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple decryption function (matches google-oauth-callback)
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

async function getGoogleToken(userId: string, supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Google OAuth token not found. Please connect your Google account first.');
  }

  return await decryptToken(data.access_token);
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...parameters } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('❌ No Authorization header provided');
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔍 Validating Supabase user token...');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error('❌ Supabase auth error:', userError);
      throw new Error(`Authentication failed: ${userError.message}. Please refresh the page and log in again.`);
    }
    
    if (!user) {
      console.error('❌ No user found for token');
      throw new Error('Invalid user token. Please refresh the page and log in again.');
    }

    console.log('✅ User authenticated:', user.id);
    console.log('🔍 Fetching Google OAuth token...');

    const googleToken = await getGoogleToken(user.id, supabase);
    console.log('✅ Google token retrieved successfully');
    
    let result;

    console.log(`📧 Executing Gmail action: ${action}`);

    switch (action) {
      case 'list_emails': {
        const { maxResults = 10, query = '', labelIds = [] } = parameters;
        const queryParams = new URLSearchParams({
          maxResults: maxResults.toString(),
          ...(query && { q: query }),
          ...(labelIds.length > 0 && { labelIds: labelIds.join(',') })
        });
        
        console.log('📨 Fetching email list...');
        result = await callGmailAPI(`/users/me/messages?${queryParams}`, googleToken);
        
        // Get email details for each message
        if (result.messages) {
          console.log(`📧 Fetching details for ${Math.min(result.messages.length, 5)} emails...`);
          const emails = await Promise.all(
            result.messages.slice(0, 5).map(async (msg: any) => {
              const details = await callGmailAPI(`/users/me/messages/${msg.id}`, googleToken);
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
          console.log('✅ Email details fetched successfully');
        }
        break;
      }

      case 'get_email': {
        const { messageId } = parameters;
        if (!messageId) throw new Error('Message ID is required');
        
        result = await callGmailAPI(`/users/me/messages/${messageId}`, googleToken);
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
        
        result = await callGmailAPI('/users/me/messages/send', googleToken, {
          method: 'POST',
          body: { raw: encodedEmail }
        });
        break;
      }

      case 'search_emails': {
        const { query } = parameters;
        if (!query) throw new Error('Search query is required');
        
        result = await callGmailAPI(`/users/me/messages?q=${encodeURIComponent(query)}`, googleToken);
        break;
      }

      case 'mark_as_read': {
        const { messageId } = parameters;
        if (!messageId) throw new Error('Message ID is required');
        
        result = await callGmailAPI(`/users/me/messages/${messageId}/modify`, googleToken, {
          method: 'POST',
          body: { removeLabelIds: ['UNREAD'] }
        });
        break;
      }

      case 'delete_email': {
        const { messageId } = parameters;
        if (!messageId) throw new Error('Message ID is required');
        
        result = await callGmailAPI(`/users/me/messages/${messageId}/trash`, googleToken, {
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
        data: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Gmail Tools error:', error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || 'An unexpected error occurred';
    
    if (errorMessage.includes('Google OAuth token not found')) {
      errorMessage = 'Google account not connected. Please connect your Google account in the settings.';
    } else if (errorMessage.includes('Authentication failed') || errorMessage.includes('Invalid user token')) {
      errorMessage = 'Session expired. Please refresh the page and log in again.';
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
