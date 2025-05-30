import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Drive API base URL
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
}

interface DriveResponse {
  files?: DriveFile[];
  nextPageToken?: string;
}

// Simple encryption/decryption using Web Crypto API (duplicated from google-oauth-callback)
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
    throw new Error('Google Drive not connected. Please connect your Google Drive account first.');
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
    return decryptedAccessToken;
  }

  // Token expired, refresh it
  if (!decryptedRefreshToken) {
    throw new Error('Google Drive connection expired. Please reconnect your account.');
  }

  console.log('Refreshing expired OAuth token for user:', userId);

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
    throw new Error('Failed to refresh Google Drive access. Please reconnect your account.');
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

  console.log('Successfully refreshed OAuth token for user:', userId);
  return refreshData.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action,
      file_id,
      folder_id,
      query,
      file_name,
      content,
      mime_type,
      limit = 10,
      userId
    } = await req.json();

    console.log('Google Drive action:', action, 'for user:', userId);

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

    // Handle special actions that don't require API calls
    if (action === 'get_connection_status') {
      const { data: tokenData, error } = await supabase
        .from('google_oauth_tokens')
        .select('expires_at, scope')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking connection status:', error);
        return new Response(
          JSON.stringify({
            success: true,
            data: { connected: false }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!tokenData) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { connected: false }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            connected: true,
            expires_at: tokenData.expires_at
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      const { error } = await supabase
        .from('google_oauth_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new Error('Failed to disconnect Google Drive');
      }

      // Clear cache
      tokenCache.delete(userId);

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: 'Successfully disconnected Google Drive' }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get valid access token (handles refresh and decryption if needed)
    const accessToken = await getValidAccessToken(userId, supabase);

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let result;

    switch (action) {
      case 'list_files':
        result = await listFiles(headers, folder_id, limit);
        break;

      case 'search_files':
        if (!query) {
          throw new Error('Query parameter is required for search');
        }
        result = await searchFiles(headers, query, limit);
        break;

      case 'get_file_metadata':
        if (!file_id) {
          throw new Error('File ID is required for getting metadata');
        }
        result = await getFileMetadata(headers, file_id);
        break;

      case 'get_file_content':
        if (!file_id) {
          throw new Error('File ID is required for getting content');
        }
        result = await getFileContent(headers, file_id);
        break;

      case 'create_folder':
        if (!file_name) {
          throw new Error('Folder name is required');
        }
        result = await createFolder(headers, file_name, folder_id);
        break;

      case 'upload_file':
        if (!file_name || !content) {
          throw new Error('File name and content are required for upload');
        }
        result = await uploadFile(headers, file_name, content, mime_type || 'text/plain', folder_id);
        break;

      case 'share_file':
        if (!file_id) {
          throw new Error('File ID is required for sharing');
        }
        result = await shareFile(headers, file_id);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        action: action
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Google Drive API error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.message.includes('not connected') ? 
          'Connect your Google Drive account in the Tools page' : 
          'Check your Google Drive connection'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function listFiles(headers: Record<string, string>, folderId?: string, limit: number = 10): Promise<DriveResponse> {
  let url = `${DRIVE_API_BASE}/files?pageSize=${limit}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink)`;
  
  if (folderId) {
    url += `&q='${folderId}' in parents`;
  }

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list files: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function searchFiles(headers: Record<string, string>, query: string, limit: number = 10): Promise<DriveResponse> {
  const searchQuery = encodeURIComponent(`name contains '${query}' or fullText contains '${query}'`);
  const url = `${DRIVE_API_BASE}/files?q=${searchQuery}&pageSize=${limit}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)`;

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to search files: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function getFileMetadata(headers: Record<string, string>, fileId: string): Promise<DriveFile> {
  const url = `${DRIVE_API_BASE}/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink`;

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get file metadata: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function getFileContent(headers: Record<string, string>, fileId: string): Promise<{ content: string; metadata: DriveFile }> {
  // First get file metadata
  const metadata = await getFileMetadata(headers, fileId);
  
  // For Google Docs, Sheets, Slides, we need to export them
  let contentUrl;
  let exportHeaders = { ...headers };
  
  if (metadata.mimeType.includes('google-apps')) {
    // Export Google Workspace files
    if (metadata.mimeType.includes('document')) {
      contentUrl = `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=text/plain`;
    } else if (metadata.mimeType.includes('spreadsheet')) {
      contentUrl = `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=text/csv`;
    } else if (metadata.mimeType.includes('presentation')) {
      contentUrl = `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=text/plain`;
    } else {
      throw new Error(`Cannot export file type: ${metadata.mimeType}`);
    }
  } else {
    // Download regular files
    contentUrl = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;
  }

  const response = await fetch(contentUrl, { headers: exportHeaders });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get file content: ${response.status} - ${errorText}`);
  }

  const content = await response.text();
  
  return { content, metadata };
}

async function createFolder(headers: Record<string, string>, name: string, parentId?: string): Promise<DriveFile> {
  const metadata: any = {
    name: name,
    mimeType: 'application/vnd.google-apps.folder'
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const response = await fetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers,
    body: JSON.stringify(metadata)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create folder: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function uploadFile(headers: Record<string, string>, name: string, content: string, mimeType: string, parentId?: string): Promise<DriveFile> {
  const metadata: any = {
    name: name
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  // Simple upload for text content
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;

  const multipartRequestBody = 
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    close_delim;

  const response = await fetch(`${DRIVE_API_BASE}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': `multipart/related; boundary="${boundary}"`
    },
    body: multipartRequestBody
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload file: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function shareFile(headers: Record<string, string>, fileId: string): Promise<{ message: string; shareLink: string }> {
  // Make file publicly readable
  const permission = {
    role: 'reader',
    type: 'anyone'
  };

  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}/permissions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(permission)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to share file: ${response.status} - ${errorText}`);
  }

  // Get the shareable link
  const metadata = await getFileMetadata(headers, fileId);
  
  return {
    message: 'File shared successfully',
    shareLink: metadata.webViewLink || `https://drive.google.com/file/d/${fileId}/view`
  };
}
