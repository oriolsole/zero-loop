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
  issue_keys?: string[];
  summary?: string;
  description?: string;
  issue_type?: string;
  priority?: string;
  assignee?: string;
  status?: string;
  transition?: string;
  jql?: string;
  comment?: string;
  time_spent?: string;
  work_description?: string;
  labels?: string[];
  components?: string[];
  fix_versions?: string[];
  custom_fields?: Record<string, any>;
  watcher?: string;
  limit?: number;
  start_at?: number;
  board_id?: string;
  sprint_id?: string;
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
    console.log('Enhanced Jira Tools request:', body);

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

    // Parse Jira configuration
    let jiraConfig: JiraConfig;
    try {
      const secretKey = secrets[0].key;
      jiraConfig = JSON.parse(secretKey);
      
      if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken) {
        throw new Error('Missing required fields in Jira configuration');
      }
    } catch (e) {
      throw new Error(
        'Invalid Jira configuration format. Please update your Jira settings with the following JSON format:\n\n' +
        '{\n' +
        '  "baseUrl": "https://your-domain.atlassian.net",\n' +
        '  "email": "your-email@example.com",\n' +
        '  "apiToken": "your-api-token"\n' +
        '}\n\n' +
        'You can get your API token from: https://id.atlassian.com/manage-profile/security/api-tokens'
      );
    }

    // Remove trailing slash from baseUrl if present
    jiraConfig.baseUrl = jiraConfig.baseUrl.replace(/\/$/, '');

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

      case 'delete_issue':
        if (!body.issue_key) {
          throw new Error('issue_key is required for delete_issue action');
        }
        result = await deleteIssue(jiraConfig.baseUrl, baseHeaders, body.issue_key);
        break;

      case 'add_comment':
        if (!body.issue_key || !body.comment) {
          throw new Error('issue_key and comment are required for add_comment action');
        }
        result = await addComment(jiraConfig.baseUrl, baseHeaders, body.issue_key, body.comment);
        break;

      case 'get_comments':
        if (!body.issue_key) {
          throw new Error('issue_key is required for get_comments action');
        }
        result = await getComments(jiraConfig.baseUrl, baseHeaders, body.issue_key);
        break;

      case 'search_issues':
        result = await searchIssues(jiraConfig.baseUrl, baseHeaders, body);
        break;

      case 'get_transitions':
        if (!body.issue_key) {
          throw new Error('issue_key is required for get_transitions action');
        }
        result = await getTransitions(jiraConfig.baseUrl, baseHeaders, body.issue_key);
        break;

      case 'transition_issue':
        if (!body.issue_key || !body.transition) {
          throw new Error('issue_key and transition are required for transition_issue action');
        }
        result = await transitionIssue(jiraConfig.baseUrl, baseHeaders, body);
        break;

      case 'assign_issue':
        if (!body.issue_key || !body.assignee) {
          throw new Error('issue_key and assignee are required for assign_issue action');
        }
        result = await assignIssue(jiraConfig.baseUrl, baseHeaders, body.issue_key, body.assignee);
        break;

      case 'get_watchers':
        if (!body.issue_key) {
          throw new Error('issue_key is required for get_watchers action');
        }
        result = await getWatchers(jiraConfig.baseUrl, baseHeaders, body.issue_key);
        break;

      case 'add_watcher':
        if (!body.issue_key || !body.watcher) {
          throw new Error('issue_key and watcher are required for add_watcher action');
        }
        result = await addWatcher(jiraConfig.baseUrl, baseHeaders, body.issue_key, body.watcher);
        break;

      case 'add_worklog':
        if (!body.issue_key || !body.time_spent) {
          throw new Error('issue_key and time_spent are required for add_worklog action');
        }
        result = await addWorklog(jiraConfig.baseUrl, baseHeaders, body);
        break;

      case 'get_worklog':
        if (!body.issue_key) {
          throw new Error('issue_key is required for get_worklog action');
        }
        result = await getWorklog(jiraConfig.baseUrl, baseHeaders, body.issue_key);
        break;

      case 'bulk_update_issues':
        if (!body.issue_keys || body.issue_keys.length === 0) {
          throw new Error('issue_keys array is required for bulk_update_issues action');
        }
        result = await bulkUpdateIssues(jiraConfig.baseUrl, baseHeaders, body);
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
    console.error('Enhanced Jira Tools error:', error);
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
  const issueData: any = {
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

  // Add optional fields
  if (body.priority) {
    issueData.fields.priority = { name: body.priority };
  }

  if (body.assignee) {
    issueData.fields.assignee = { emailAddress: body.assignee };
  }

  if (body.labels && body.labels.length > 0) {
    issueData.fields.labels = body.labels;
  }

  if (body.components && body.components.length > 0) {
    issueData.fields.components = body.components.map(c => ({ name: c }));
  }

  if (body.custom_fields) {
    Object.assign(issueData.fields, body.custom_fields);
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
    issueType: issue.fields.issuetype?.name,
    labels: issue.fields.labels || [],
    components: issue.fields.components?.map((c: any) => c.name) || []
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

  if (body.labels) {
    updateData.fields.labels = body.labels;
  }

  if (body.components) {
    updateData.fields.components = body.components.map(c => ({ name: c }));
  }

  if (body.custom_fields) {
    Object.assign(updateData.fields, body.custom_fields);
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

async function deleteIssue(baseUrl: string, headers: Record<string, string>, issueKey: string) {
  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to delete issue: ${response.status} ${response.statusText}`);
  }

  return { success: true, message: `Issue ${issueKey} deleted successfully` };
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

async function getComments(baseUrl: string, headers: Record<string, string>, issueKey: string) {
  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/comment`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to get comments: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return {
    total: result.total,
    comments: result.comments.map((comment: any) => ({
      id: comment.id,
      author: comment.author?.displayName,
      body: comment.body,
      created: comment.created,
      updated: comment.updated
    }))
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

    if (body.status) {
      conditions.push(`status = "${body.status}"`);
    }
    
    jql = conditions.length > 0 ? conditions.join(' AND ') : 'order by created DESC';
  }

  const searchParams = new URLSearchParams({
    jql: jql,
    maxResults: (body.limit || 50).toString(),
    startAt: (body.start_at || 0).toString(),
    fields: 'key,summary,status,priority,assignee,reporter,created,updated,issuetype,labels,components'
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
    startAt: searchResult.startAt,
    maxResults: searchResult.maxResults,
    issues: searchResult.issues.map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      priority: issue.fields.priority?.name,
      assignee: issue.fields.assignee?.displayName,
      reporter: issue.fields.reporter?.displayName,
      created: issue.fields.created,
      updated: issue.fields.updated,
      issueType: issue.fields.issuetype?.name,
      labels: issue.fields.labels || [],
      components: issue.fields.components?.map((c: any) => c.name) || []
    }))
  };
}

async function getTransitions(baseUrl: string, headers: Record<string, string>, issueKey: string) {
  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to get transitions: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return {
    transitions: result.transitions.map((t: any) => ({
      id: t.id,
      name: t.name,
      to: {
        id: t.to.id,
        name: t.to.name,
        statusCategory: t.to.statusCategory?.name
      }
    }))
  };
}

async function transitionIssue(baseUrl: string, headers: Record<string, string>, body: JiraToolsRequest) {
  // First get available transitions to find the correct transition ID
  const transitionsResponse = await fetch(`${baseUrl}/rest/api/3/issue/${body.issue_key}/transitions`, {
    method: 'GET',
    headers
  });

  if (!transitionsResponse.ok) {
    throw new Error(`Failed to get available transitions: ${transitionsResponse.status}`);
  }

  const transitionsData = await transitionsResponse.json();
  const transition = transitionsData.transitions.find((t: any) => 
    t.name.toLowerCase() === body.transition!.toLowerCase() || t.id === body.transition
  );

  if (!transition) {
    throw new Error(`Transition "${body.transition}" not found. Available transitions: ${transitionsData.transitions.map((t: any) => t.name).join(', ')}`);
  }

  const transitionData = {
    transition: {
      id: transition.id
    }
  };

  const response = await fetch(`${baseUrl}/rest/api/3/issue/${body.issue_key}/transitions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(transitionData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to transition issue: ${response.status} ${JSON.stringify(errorData)}`);
  }

  return { 
    success: true, 
    message: `Issue ${body.issue_key} transitioned to ${transition.to.name}`,
    transition: {
      from: transition.from?.name,
      to: transition.to.name
    }
  };
}

async function assignIssue(baseUrl: string, headers: Record<string, string>, issueKey: string, assignee: string) {
  const assignData = {
    fields: {
      assignee: { emailAddress: assignee }
    }
  };

  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(assignData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to assign issue: ${response.status} ${JSON.stringify(errorData)}`);
  }

  return { success: true, message: `Issue ${issueKey} assigned to ${assignee}` };
}

async function getWatchers(baseUrl: string, headers: Record<string, string>, issueKey: string) {
  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/watchers`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to get watchers: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return {
    watchCount: result.watchCount,
    isWatching: result.isWatching,
    watchers: result.watchers?.map((w: any) => ({
      accountId: w.accountId,
      displayName: w.displayName,
      emailAddress: w.emailAddress
    })) || []
  };
}

async function addWatcher(baseUrl: string, headers: Record<string, string>, issueKey: string, watcher: string) {
  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/watchers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(watcher)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to add watcher: ${response.status} ${JSON.stringify(errorData)}`);
  }

  return { success: true, message: `Added ${watcher} as watcher to ${issueKey}` };
}

async function addWorklog(baseUrl: string, headers: Record<string, string>, body: JiraToolsRequest) {
  const worklogData = {
    timeSpent: body.time_spent,
    comment: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: body.work_description || "Work logged"
            }
          ]
        }
      ]
    }
  };

  const response = await fetch(`${baseUrl}/rest/api/3/issue/${body.issue_key}/worklog`, {
    method: 'POST',
    headers,
    body: JSON.stringify(worklogData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to add worklog: ${response.status} ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    timeSpent: result.timeSpent,
    timeSpentSeconds: result.timeSpentSeconds,
    author: result.author?.displayName,
    created: result.created
  };
}

async function getWorklog(baseUrl: string, headers: Record<string, string>, issueKey: string) {
  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/worklog`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to get worklog: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return {
    total: result.total,
    worklogs: result.worklogs.map((w: any) => ({
      id: w.id,
      author: w.author?.displayName,
      timeSpent: w.timeSpent,
      timeSpentSeconds: w.timeSpentSeconds,
      comment: w.comment,
      created: w.created,
      updated: w.updated
    }))
  };
}

async function bulkUpdateIssues(baseUrl: string, headers: Record<string, string>, body: JiraToolsRequest) {
  const results = [];
  
  for (const issueKey of body.issue_keys!) {
    try {
      const updateResult = await updateIssue(baseUrl, headers, { ...body, issue_key: issueKey });
      results.push({ issueKey, success: true, result: updateResult });
    } catch (error) {
      results.push({ issueKey, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return {
    summary: {
      total: body.issue_keys!.length,
      successful: successCount,
      failed: failureCount
    },
    details: results
  };
}
