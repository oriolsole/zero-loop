
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  mcpEndpoint: string;
  requiresToken?: string;
}

interface ValidationResponse {
  valid: boolean;
  service: string;
  error?: string;
  details?: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { mcpEndpoint, requiresToken }: ValidationRequest = await req.json();
    console.log(`🔍 Validating credentials for ${mcpEndpoint} (requires: ${requiresToken})`);

    let validation: ValidationResponse;

    if (mcpEndpoint === 'google-drive-tools') {
      validation = await validateGoogleDriveCredentials(supabase, user.id);
    } else if (requiresToken) {
      validation = await validateAPIKeyCredentials(supabase, user.id, requiresToken);
    } else {
      validation = {
        valid: true,
        service: mcpEndpoint,
        details: { message: 'No authentication required' }
      };
    }

    console.log(`✅ Validation result for ${mcpEndpoint}:`, validation);

    return new Response(
      JSON.stringify(validation),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Validation error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        service: 'unknown',
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function validateGoogleDriveCredentials(supabase: any, userId: string): Promise<ValidationResponse> {
  try {
    // Get stored OAuth tokens
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('google_access_token, google_refresh_token, google_token_expires_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.log('📋 No profile found for user');
      return {
        valid: false,
        service: 'google-drive',
        error: 'No Google Drive connection found'
      };
    }

    // Decrypt and validate tokens
    const encryptionKey = Deno.env.get('GOOGLE_OAUTH_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.log('🔑 No encryption key available');
      return {
        valid: false,
        service: 'google-drive',
        error: 'OAuth encryption not configured'
      };
    }

    if (!profile.google_access_token) {
      console.log('🔑 No Google access token found');
      return {
        valid: false,
        service: 'google-drive',
        error: 'No Google Drive OAuth token found'
      };
    }

    // Decrypt token
    const decryptedToken = await decryptToken(profile.google_access_token, encryptionKey);
    
    // Test the token with a lightweight Google Drive API call
    const testResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        'Authorization': `Bearer ${decryptedToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (testResponse.ok) {
      console.log('✅ Google Drive token is valid');
      return {
        valid: true,
        service: 'google-drive',
        details: { message: 'Google Drive OAuth token is valid' }
      };
    } else if (testResponse.status === 401) {
      console.log('🔄 Google Drive token expired, attempting refresh');
      // Token might be expired, try to refresh if we have refresh token
      if (profile.google_refresh_token) {
        const refreshResult = await refreshGoogleToken(profile.google_refresh_token, encryptionKey);
        if (refreshResult.success) {
          // Update profile with new token
          await supabase
            .from('profiles')
            .update({
              google_access_token: await encryptToken(refreshResult.accessToken, encryptionKey),
              google_token_expires_at: new Date(Date.now() + refreshResult.expiresIn * 1000).toISOString()
            })
            .eq('id', userId);

          return {
            valid: true,
            service: 'google-drive',
            details: { message: 'Google Drive token refreshed successfully' }
          };
        }
      }
      
      return {
        valid: false,
        service: 'google-drive',
        error: 'Google Drive token expired and cannot be refreshed'
      };
    } else {
      console.log('❌ Google Drive API error:', testResponse.status);
      return {
        valid: false,
        service: 'google-drive',
        error: `Google Drive API error: ${testResponse.status}`
      };
    }

  } catch (error) {
    console.error('❌ Google Drive validation error:', error);
    return {
      valid: false,
      service: 'google-drive',
      error: error.message
    };
  }
}

async function validateAPIKeyCredentials(supabase: any, userId: string, provider: string): Promise<ValidationResponse> {
  try {
    const { data: secrets, error } = await supabase
      .from('user_secrets')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true);

    if (error) {
      console.error(`❌ Error fetching ${provider} secrets:`, error);
      return {
        valid: false,
        service: provider,
        error: `Failed to check ${provider} credentials`
      };
    }

    if (!secrets || secrets.length === 0) {
      console.log(`📋 No ${provider} credentials found`);
      return {
        valid: false,
        service: provider,
        error: `No ${provider} API key found`
      };
    }

    // For most API keys, we just check if they exist
    // In the future, we could add specific validation calls for each service
    console.log(`✅ Found ${provider} credentials`);
    return {
      valid: true,
      service: provider,
      details: { message: `${provider} API key is configured` }
    };

  } catch (error) {
    console.error(`❌ ${provider} validation error:`, error);
    return {
      valid: false,
      service: provider,
      error: error.message
    };
  }
}

async function decryptToken(encryptedData: string, key: string): Promise<string> {
  try {
    const [ivHex, encryptedHex] = encryptedData.split(':');
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const keyBuffer = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key.slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      keyBuffer,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new Error(`Failed to decrypt token: ${error.message}`);
  }
}

async function encryptToken(data: string, key: string): Promise<string> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyBuffer = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key.slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      keyBuffer,
      new TextEncoder().encode(data)
    );
    
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `${ivHex}:${encryptedHex}`;
  } catch (error) {
    throw new Error(`Failed to encrypt token: ${error.message}`);
  }
}

async function refreshGoogleToken(encryptedRefreshToken: string, encryptionKey: string) {
  try {
    const refreshToken = await decryptToken(encryptedRefreshToken, encryptionKey);
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      accessToken: data.access_token,
      expiresIn: data.expires_in
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
