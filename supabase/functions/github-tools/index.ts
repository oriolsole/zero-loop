
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface GitHubRequest {
  action: string;
  repository?: string;
  owner?: string;
  path?: string;
  ref?: string;
  query?: string;
  userId?: string;
}

async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_secrets')
      .select('key')
      .eq('user_id', userId)
      .eq('provider', 'github')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error || !data || data.length === 0) {
      console.error('GitHub token not found for user:', userId);
      return null;
    }
    
    return data[0].key;
  } catch (error) {
    console.error('Error fetching GitHub token:', error);
    return null;
  }
}

async function makeGitHubAPICall(token: string, url: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ZeroLoop-AI-Agent'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function handleGitHubAction(request: GitHubRequest, token: string): Promise<any> {
  const { action, repository, owner, path, ref = 'main', query } = request;
  
  console.log('GitHub action:', action, { repository, owner, path, ref });

  switch (action) {
    case 'get_repository':
      if (!owner || !repository) {
        throw new Error('Owner and repository are required for get_repository');
      }
      return await makeGitHubAPICall(token, `https://api.github.com/repos/${owner}/${repository}`);

    case 'get_file_content':
      if (!owner || !repository || !path) {
        throw new Error('Owner, repository, and path are required for get_file_content');
      }
      return await makeGitHubAPICall(token, `https://api.github.com/repos/${owner}/${repository}/contents/${path}?ref=${ref}`);

    case 'list_files':
      if (!owner || !repository) {
        throw new Error('Owner and repository are required for list_files');
      }
      const listPath = path || '';
      return await makeGitHubAPICall(token, `https://api.github.com/repos/${owner}/${repository}/contents/${listPath}?ref=${ref}`);

    case 'get_readme':
      if (!owner || !repository) {
        throw new Error('Owner and repository are required for get_readme');
      }
      return await makeGitHubAPICall(token, `https://api.github.com/repos/${owner}/${repository}/readme?ref=${ref}`);

    case 'search_repositories':
      if (!query) {
        throw new Error('Query is required for search_repositories');
      }
      return await makeGitHubAPICall(token, `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}`);

    case 'get_branches':
      if (!owner || !repository) {
        throw new Error('Owner and repository are required for get_branches');
      }
      return await makeGitHubAPICall(token, `https://api.github.com/repos/${owner}/${repository}/branches`);

    case 'get_commits':
      if (!owner || !repository) {
        throw new Error('Owner and repository are required for get_commits');
      }
      return await makeGitHubAPICall(token, `https://api.github.com/repos/${owner}/${repository}/commits?sha=${ref}&per_page=10`);

    default:
      throw new Error(`Unsupported GitHub action: ${action}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('GitHub Tools request:', requestBody);

    // Extract userId from the request or headers
    const userId = requestBody.userId || requestBody.user_id;
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get GitHub token for the user
    const token = await getGitHubToken(userId);
    if (!token) {
      throw new Error('GitHub token not found. Please add your GitHub token in the settings.');
    }

    // Handle the GitHub action
    const result = await handleGitHubAction(requestBody, token);

    // For file content, decode base64 if it's a file
    if (requestBody.action === 'get_file_content' && result.content && result.encoding === 'base64') {
      try {
        const decodedContent = atob(result.content.replace(/\s/g, ''));
        result.decoded_content = decodedContent;
      } catch (error) {
        console.warn('Failed to decode base64 content:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        action: requestBody.action
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('GitHub Tools error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while processing the GitHub request',
        details: error.stack
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
