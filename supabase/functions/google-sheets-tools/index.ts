
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

async function callSheetsAPI(endpoint: string, token: string, options: any = {}) {
  const response = await fetch(`https://sheets.googleapis.com/v4${endpoint}`, {
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
    throw new Error(`Sheets API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  console.log('📊 Google Sheets Tools request received');

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

    console.log(`📊 Executing Sheets action: ${action}`);

    switch (action) {
      case 'get_sheet_data': {
        const { spreadsheetId, range = 'A1:Z1000' } = parameters;
        if (!spreadsheetId) throw new Error('Spreadsheet ID is required');
        
        result = await callSheetsAPI(`/spreadsheets/${spreadsheetId}/values/${range}`, googleToken);
        break;
      }

      case 'update_cells': {
        const { spreadsheetId, range, values } = parameters;
        if (!spreadsheetId || !range || !values) {
          throw new Error('Spreadsheet ID, range, and values are required');
        }
        
        result = await callSheetsAPI(`/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, googleToken, {
          method: 'PUT',
          body: { values }
        });
        break;
      }

      case 'append_data': {
        const { spreadsheetId, range, values } = parameters;
        if (!spreadsheetId || !range || !values) {
          throw new Error('Spreadsheet ID, range, and values are required');
        }
        
        result = await callSheetsAPI(`/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`, googleToken, {
          method: 'POST',
          body: { values }
        });
        break;
      }

      case 'create_sheet': {
        const { title = 'New Spreadsheet' } = parameters;
        
        result = await callSheetsAPI('/spreadsheets', googleToken, {
          method: 'POST',
          body: {
            properties: { title }
          }
        });
        break;
      }

      case 'get_spreadsheets': {
        // Note: This requires Drive API to list files, using Sheets API to get spreadsheet info instead
        const { spreadsheetId } = parameters;
        if (!spreadsheetId) throw new Error('Spreadsheet ID is required for this action');
        
        result = await callSheetsAPI(`/spreadsheets/${spreadsheetId}`, googleToken);
        break;
      }

      case 'clear_range': {
        const { spreadsheetId, range } = parameters;
        if (!spreadsheetId || !range) {
          throw new Error('Spreadsheet ID and range are required');
        }
        
        result = await callSheetsAPI(`/spreadsheets/${spreadsheetId}/values/${range}:clear`, googleToken, {
          method: 'POST'
        });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('✅ Sheets operation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Sheets Tools error:', error);
    
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
