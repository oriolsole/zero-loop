
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

interface JiraToolsRequest {
  action: string;
  project_key?: string;
  issue_key?: string;
  summary?: string;
  description?: string;
  issue_type?: string;
  priority?: string;
  assignee?: string;
  jql?: string;
  comment?: string;
  limit?: number;
  userId?: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: JiraToolsRequest = await req.json();
    console.log('Jira Tools request:', body);

    const { action, userId } = body;

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get Jira credentials from user secrets
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: secrets, error: secretsError } = await supabase
      .from('user_secrets')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'jira')
      .eq('is_active', true);

    if (secretsError) {
      throw new Error(`Failed to fetch Jira credentials: ${secretsError.message}`);
    }

    if (!secrets || secrets.length === 0) {
      throw new Error('Jira API credentials not found. Please configure your Jira API token in the settings.');
    }

    // Parse Jira configuration from the secret key
    let jiraConfig: JiraConfig;
    try {
      jiraConfig = JSON.parse(secrets[0].key);
    } catch (e) {
      throw new Error('Invalid Jira configuration format. Expected JSON with baseUrl, email, and apiToken.');
    }

    if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken) {
      throw new Error('Jira configuration missing required fields: baseUrl, email, apiToken');
    }

    const authHeader = `Basic ${btoa(`${jiraConfig.email}:${jiraConfig.apiToken}`)}`;
    const baseHeaders = {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    let result;

    switch (action) {
      case 'list_projects':
        result = await listProjects(jiraConfig.baseUrl, baseHeaders);
        break;

      case 'get_project':
        if (!body.project_key) {
          throw new Error('project_key is required for get_project action');
        }
        result = await getProject(jiraConfig.baseUrl, baseHeaders, body.project_key);
        break;

      case 'get_issue_types':
        result = await getIssueTypes(jiraConfig.baseUrl, baseHeaders, body.project_key);
        break;

      case 'create_issue':
        if (!body.project_key || !body.summary || !body.issue_type) {
          throw new Error('project_key, summary, and issue_type are required for create_issue action');
        }
        result = await createIssue(jiraConfig.baseUrl, baseHeaders, body);
        break;

      case 'get_issue':
        if (!body.issue_key) {
          throw new Error('issue_key is required for get_issue action');
        }
        result = await getIssue(jiraConfig.baseUrl, baseHeaders, body.issue_key);
        break;

      case 'update_issue':
        if (!body.issue_key) {
          throw new Error('issue_key is required for update_issue action');
        }
        result = await updateIssue(jiraConfig.baseUrl, baseHeaders, body);
        break;

      case 'add_comment':
        if (!body.issue_key || !body.comment) {
          throw new Error('issue_key and comment are required for add_comment action');
        }
        result = await addComment(jiraConfig.baseUrl, baseHeaders, body.issue_key, body.comment);
        break;

      case 'search_issues':
        result = await searchIssues(jiraConfig.baseUrl, baseHeaders, body);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: result,
      action: action
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Jira Tools error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function listProjects(baseUrl: string, headers: Record<string, string>) {
  const response = await fetch(`${baseUrl}/rest/api/3/project`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to list projects: ${response.status} ${response.statusText}`);
  }

  const projects = await response.json();
  return projects.map((p: any) => ({
    key: p.key,
    name: p.name,
    description: p.description,
    projectTypeKey: p.projectTypeKey,
    lead: p.lead?.displayName
  }));
}

async function getProject(baseUrl: string, headers: Record<string, string>, projectKey: string) {
  const response = await fetch(`${baseUrl}/rest/api/3/project/${projectKey}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to get project: ${response.status} ${response.statusText}`);
  }

  const project = await response.json();
  return {
    key: project.key,
    name: project.name,
    description: project.description,
    projectTypeKey: project.projectTypeKey,
    lead: project.lead?.displayName,
    components: project.components?.map((c: any) => ({ id: c.id, name: c.name })),
    versions: project.versions?.map((v: any) => ({ id: v.id, name: v.name }))
  };
}

async function getIssueTypes(baseUrl: string, headers: Record<string, string>, projectKey?: string) {
  const url = projectKey 
    ? `${baseUrl}/rest/api/3/issuetype/project?projectId=${projectKey}`
    : `${baseUrl}/rest/api/3/issuetype`;
    
  const response = await fetch(url, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to get issue types: ${response.status} ${response.statusText}`);
  }

  const issueTypes = await response.json();
  return issueTypes.map((it: any) => ({
    id: it.id,
    name: it.name,
    description: it.description,
    iconUrl: it.iconUrl
  }));
}

async function createIssue(baseUrl: string, headers: Record<string, string>, body: JiraToolsRequest) {
  const issueData = {
    fields: {
      project: { key: body.project_key },
      summary: body.summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: body.description || body.summary
              }
            ]
          }
        ]
      },
      issuetype: { name: body.issue_type }
    }
  };

  if (body.priority) {
    (issueData.fields as any).priority = { name: body.priority };
  }

  if (body.assignee) {
    (issueData.fields as any).assignee = { emailAddress: body.assignee };
  }

  const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers,
    body: JSON.stringify(issueData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create issue: ${response.status} ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  return {
    key: result.key,
    id: result.id,
    self: result.self
  };
}

async function getIssue(baseUrl: string, headers: Record<string, string>, issueKey: string) {
  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to get issue: ${response.status} ${response.statusText}`);
  }

  const issue = await response.json();
  return {
    key: issue.key,
    summary: issue.fields.summary,
    description: issue.fields.description,
    status: issue.fields.status?.name,
    priority: issue.fields.priority?.name,
    assignee: issue.fields.assignee?.displayName,
    reporter: issue.fields.reporter?.displayName,
    created: issue.fields.created,
    updated: issue.fields.updated,
    issueType: issue.fields.issuetype?.name
  };
}

async function updateIssue(baseUrl: string, headers: Record<string, string>, body: JiraToolsRequest) {
  const updateData: any = { fields: {} };

  if (body.summary) {
    updateData.fields.summary = body.summary;
  }

  if (body.description) {
    updateData.fields.description = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: body.description
            }
          ]
        }
      ]
    };
  }

  if (body.priority) {
    updateData.fields.priority = { name: body.priority };
  }

  if (body.assignee) {
    updateData.fields.assignee = { emailAddress: body.assignee };
  }

  const response = await fetch(`${baseUrl}/rest/api/3/issue/${body.issue_key}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to update issue: ${response.status} ${JSON.stringify(errorData)}`);
  }

  return { success: true, message: `Issue ${body.issue_key} updated successfully` };
}

async function addComment(baseUrl: string, headers: Record<string, string>, issueKey: string, comment: string) {
  const commentData = {
    body: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: comment
            }
          ]
        }
      ]
    }
  };

  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    headers,
    body: JSON.stringify(commentData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to add comment: ${response.status} ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    body: comment,
    author: result.author?.displayName,
    created: result.created
  };
}

async function searchIssues(baseUrl: string, headers: Record<string, string>, body: JiraToolsRequest) {
  let jql = body.jql;
  
  if (!jql) {
    // Build JQL based on provided parameters
    const conditions = [];
    
    if (body.project_key) {
      conditions.push(`project = "${body.project_key}"`);
    }
    
    if (body.assignee) {
      conditions.push(`assignee = "${body.assignee}"`);
    }
    
    if (body.issue_type) {
      conditions.push(`issuetype = "${body.issue_type}"`);
    }
    
    if (body.priority) {
      conditions.push(`priority = "${body.priority}"`);
    }
    
    jql = conditions.length > 0 ? conditions.join(' AND ') : 'order by created DESC';
  }

  const searchParams = new URLSearchParams({
    jql: jql,
    maxResults: (body.limit || 50).toString(),
    fields: 'key,summary,status,priority,assignee,reporter,created,updated,issuetype'
  });

  const response = await fetch(`${baseUrl}/rest/api/3/search?${searchParams}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to search issues: ${response.status} ${response.statusText}`);
  }

  const searchResult = await response.json();
  return {
    total: searchResult.total,
    issues: searchResult.issues.map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      priority: issue.fields.priority?.name,
      assignee: issue.fields.assignee?.displayName,
      reporter: issue.fields.reporter?.displayName,
      created: issue.fields.created,
      updated: issue.fields.updated,
      issueType: issue.fields.issuetype?.name
    }))
  };
}
