import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate, Header, Payload } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

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

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Cache for access tokens
let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expires > Date.now()) {
    return cachedToken.token;
  }

  console.log('Getting new access token from service account');

  const serviceAccountKeyJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!serviceAccountKeyJson) {
    throw new Error('Google Service Account key not configured. Please add GOOGLE_SERVICE_ACCOUNT_KEY to Supabase secrets.');
  }

  let serviceAccountKey: ServiceAccountKey;
  try {
    serviceAccountKey = JSON.parse(serviceAccountKeyJson);
  } catch (error) {
    throw new Error('Invalid Google Service Account key format. Please ensure it\'s valid JSON.');
  }

  // Create JWT for Google Service Account authentication
  const now = Math.floor(Date.now() / 1000);
  const header: Header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload: Payload = {
    iss: serviceAccountKey.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: getNumericDate(60 * 60), // 1 hour
    iat: getNumericDate(0),
  };

  // Import the private key
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    new TextEncoder().encode(
      serviceAccountKey.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/, "")
        .replace(/-----END PRIVATE KEY-----/, "")
        .replace(/\s/g, "")
    ),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const jwt = await create(header, payload, privateKey);

  // Exchange JWT for access token
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token exchange failed:', errorText);
    throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  
  // Cache the token (expires in 1 hour, cache for 50 minutes to be safe)
  cachedToken = {
    token: tokenData.access_token,
    expires: Date.now() + (50 * 60 * 1000), // 50 minutes
  };

  console.log('Successfully obtained access token');
  return tokenData.access_token;
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

    // Get access token using service account
    const accessToken = await getAccessToken();

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
        details: 'Make sure Google Service Account key is properly configured in Supabase secrets'
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
