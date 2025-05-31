
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

async function callDocsAPI(endpoint: string, token: string, options: any = {}) {
  const response = await fetch(`https://docs.googleapis.com/v1${endpoint}`, {
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
    throw new Error(`Docs API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  console.log('📝 Google Docs Tools request received');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, userId, ...parameters } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`📝 Executing Docs action: ${action} for user: ${userId}`);

    // Get Google token using userId from request body (consistent with Google Drive)
    const googleToken = await getGoogleToken(userId, supabase);
    let result;

    switch (action) {
      case 'get_document': {
        const { documentId } = parameters;
        if (!documentId) throw new Error('Document ID is required');
        
        result = await callDocsAPI(`/documents/${documentId}`, googleToken);
        break;
      }

      case 'create_document': {
        const { title = 'Untitled Document' } = parameters;
        
        result = await callDocsAPI('/documents', googleToken, {
          method: 'POST',
          body: {
            title
          }
        });
        break;
      }

      case 'update_content': {
        const { documentId, content, insertIndex = 1 } = parameters;
        if (!documentId || !content) {
          throw new Error('Document ID and content are required');
        }
        
        const requests = [
          {
            insertText: {
              location: {
                index: insertIndex
              },
              text: content
            }
          }
        ];
        
        result = await callDocsAPI(`/documents/${documentId}:batchUpdate`, googleToken, {
          method: 'POST',
          body: { requests }
        });
        break;
      }

      case 'append_content': {
        const { documentId, content } = parameters;
        if (!documentId || !content) {
          throw new Error('Document ID and content are required');
        }
        
        // First get the document to find the end index
        const doc = await callDocsAPI(`/documents/${documentId}`, googleToken);
        const endIndex = doc.body.content[doc.body.content.length - 1].endIndex - 1;
        
        const requests = [
          {
            insertText: {
              location: {
                index: endIndex
              },
              text: content
            }
          }
        ];
        
        result = await callDocsAPI(`/documents/${documentId}:batchUpdate`, googleToken, {
          method: 'POST',
          body: { requests }
        });
        break;
      }

      case 'replace_text': {
        const { documentId, searchText, replaceText } = parameters;
        if (!documentId || !searchText) {
          throw new Error('Document ID and search text are required');
        }
        
        const requests = [
          {
            replaceAllText: {
              containsText: {
                text: searchText,
                matchCase: false
              },
              replaceText: replaceText || ''
            }
          }
        ];
        
        result = await callDocsAPI(`/documents/${documentId}:batchUpdate`, googleToken, {
          method: 'POST',
          body: { requests }
        });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('✅ Docs operation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Docs Tools error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
