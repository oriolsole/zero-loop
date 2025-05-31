
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

async function callContactsAPI(endpoint: string, token: string, options: any = {}) {
  const response = await fetch(`https://people.googleapis.com/v1${endpoint}`, {
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
    throw new Error(`Contacts API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  console.log('👥 Google Contacts Tools request received');

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
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const googleToken = await getGoogleToken(user.id, supabase);
    let result;

    console.log(`👥 Executing Contacts action: ${action}`);

    switch (action) {
      case 'list_contacts': {
        const { maxResults = 50 } = parameters;
        const queryParams = new URLSearchParams({
          personFields: 'names,emailAddresses,phoneNumbers,organizations,addresses',
          pageSize: maxResults.toString()
        });
        
        result = await callContactsAPI(`/people/me/connections?${queryParams}`, googleToken);
        break;
      }

      case 'create_contact': {
        const { firstName, lastName, email, phone, organization } = parameters;
        if (!firstName && !lastName && !email) {
          throw new Error('At least one of firstName, lastName, or email is required');
        }
        
        const contactData: any = {};
        
        if (firstName || lastName) {
          contactData.names = [{
            givenName: firstName || '',
            familyName: lastName || ''
          }];
        }
        
        if (email) {
          contactData.emailAddresses = [{
            value: email,
            type: 'home'
          }];
        }
        
        if (phone) {
          contactData.phoneNumbers = [{
            value: phone,
            type: 'mobile'
          }];
        }
        
        if (organization) {
          contactData.organizations = [{
            name: organization
          }];
        }
        
        result = await callContactsAPI('/people:createContact', googleToken, {
          method: 'POST',
          body: contactData
        });
        break;
      }

      case 'update_contact': {
        const { resourceName, firstName, lastName, email, phone, organization } = parameters;
        if (!resourceName) throw new Error('Resource name is required');
        
        // First get the contact to get the current etag
        const currentContact = await callContactsAPI(`/${resourceName}?personFields=names,emailAddresses,phoneNumbers,organizations,etag`, googleToken);
        
        const updateData: any = {
          resourceName,
          etag: currentContact.etag
        };
        
        if (firstName || lastName) {
          updateData.names = [{
            givenName: firstName || '',
            familyName: lastName || ''
          }];
        }
        
        if (email) {
          updateData.emailAddresses = [{
            value: email,
            type: 'home'
          }];
        }
        
        if (phone) {
          updateData.phoneNumbers = [{
            value: phone,
            type: 'mobile'
          }];
        }
        
        if (organization) {
          updateData.organizations = [{
            name: organization
          }];
        }
        
        result = await callContactsAPI(`/${resourceName}:updateContact?updatePersonFields=names,emailAddresses,phoneNumbers,organizations`, googleToken, {
          method: 'PATCH',
          body: updateData
        });
        break;
      }

      case 'search_contacts': {
        const { query } = parameters;
        if (!query) throw new Error('Search query is required');
        
        result = await callContactsAPI(`/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses,phoneNumbers`, googleToken);
        break;
      }

      case 'get_contact': {
        const { resourceName } = parameters;
        if (!resourceName) throw new Error('Resource name is required');
        
        result = await callContactsAPI(`/${resourceName}?personFields=names,emailAddresses,phoneNumbers,organizations,addresses`, googleToken);
        break;
      }

      case 'delete_contact': {
        const { resourceName } = parameters;
        if (!resourceName) throw new Error('Resource name is required');
        
        result = await callContactsAPI(`/${resourceName}:deleteContact`, googleToken, {
          method: 'DELETE'
        });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('✅ Contacts operation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Contacts Tools error:', error);
    
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
