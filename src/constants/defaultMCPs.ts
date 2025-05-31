// Define your default MCPs
import { MCP } from '@/types/mcp';
import { v4 as uuidv4 } from 'uuid';

// Define your default MCPs with working local endpoints
export const defaultMCPs: MCP[] = [
  {
    id: "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    title: "Web Search",
    description: "Search the public internet using Google Custom Search API for current information, news, articles, and external content. Use when users ask to 'search the web', 'find online', 'look up current', 'what's the latest', or need external/public information not in their knowledge base. This searches ONLY external web content, NOT internal documents or Jira projects.",
    endpoint: "google-search",
    icon: "search",
    priority: 10, // Highest priority - most commonly used
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query to find relevant web results from the internet",
        required: true
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of search results to return (default: 5)",
        required: false,
        default: 5
      }
    ],
    isDefault: true,
    default_key: "web-search",
    category: "Search",
    tags: ["search", "web", "google", "information", "internet", "external", "current", "news"],
    sampleUseCases: [
      "Current events: 'search for latest AI news', 'what's happening with ChatGPT today'",
      "Research topics: 'find information about quantum computing', 'search for React best practices'", 
      "Product information: 'look up iPhone 15 specs', 'find reviews for Tesla Model 3'",
      "How-to guides: 'search for Docker tutorial', 'find guide on setting up MongoDB'"
    ],
    suggestedPrompt: "Search for information about artificial intelligence trends 2024",
    requiresAuth: false,
    requirestoken: "google"
  },
  {
    id: uuidv4(),
    title: "Knowledge Search",
    description: "Search your personal knowledge base including uploaded documents, notes, and saved content. Use when users ask to 'search my knowledge', 'find in my documents', 'look in my notes', 'search my files', or reference previously uploaded/saved information. This searches ONLY internal content you've uploaded or saved, NOT external web content.",
    endpoint: "knowledge-proxy",
    icon: "book",
    default_key: "knowledge-search",
    isDefault: true,
    priority: 9, // Very high priority - personal knowledge is valuable
    category: "Knowledge",
    tags: ["search", "knowledge", "vector", "documents", "notes", "personal", "internal"],
    suggestedPrompt: "Search my knowledge base for information about artificial intelligence",
    requiresAuth: true,
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query to find relevant knowledge from your personal knowledge base",
        required: true
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of results to return",
        required: false,
        default: 5
      },
      {
        name: "includeNodes",
        type: "boolean",
        description: "Include knowledge nodes in search results",
        required: false,
        default: true
      },
      {
        name: "sources",
        type: "array",
        description: "Specific sources to search within",
        required: false,
        default: []
      }
    ],
    sampleUseCases: [
      "Search uploaded documents: 'find in my documents about AI', 'search my notes on machine learning'",
      "Find saved insights: 'what did I save about React hooks', 'look in my knowledge base for TypeScript tips'",
      "Retrieve personal content: 'search my files for project planning', 'find my notes on database design'",
      "Semantic search: 'find similar concepts to neural networks in my knowledge base'"
    ]
  },
  {
    id: uuidv4(),
    title: "Google Drive Tools",
    description: "Access and manage Google Drive files, folders, and documents. Upload, download, search, and organize your Google Drive content. Use when users ask to 'access my Drive', 'upload to Google Drive', 'find files in Drive', 'create folders', or manage Google Drive content.",
    endpoint: "google-drive-tools",
    icon: "hard-drive",
    priority: 8, // High priority - important productivity tool
    parameters: [
      {
        name: "action",
        type: "string",
        description: "The Google Drive action to perform",
        required: true,
        enum: ["list_files", "get_file_content", "upload_file", "search_files", "create_folder", "share_file", "get_file_metadata"]
      },
      {
        name: "file_id",
        type: "string",
        description: "Specific Google Drive file ID",
        required: false
      },
      {
        name: "folder_id",
        type: "string",
        description: "Folder ID to operate within (default: root)",
        required: false
      },
      {
        name: "query",
        type: "string",
        description: "Search query for finding files",
        required: false
      },
      {
        name: "file_name",
        type: "string",
        description: "Name for new files or folders",
        required: false
      },
      {
        name: "content",
        type: "string",
        description: "Content for file upload",
        required: false
      },
      {
        name: "mime_type",
        type: "string",
        description: "MIME type for uploaded files",
        required: false
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of results to return (default: 10)",
        required: false,
        default: 10
      }
    ],
    isDefault: true,
    default_key: "google-drive-tools",
    category: "Productivity",
    tags: ["google", "drive", "files", "documents", "storage", "cloud", "upload", "download"],
    sampleUseCases: [
      "List files: 'show me my Google Drive files', 'list recent documents'",
      "Search content: 'find all PDFs about project planning', 'search for budget spreadsheets'",
      "Upload files: 'upload this document to my Drive', 'save this content as a file'",
      "Create folders: 'create a new folder for my project', 'organize files into folders'",
      "Share files: 'make this document shareable', 'get a share link for this file'"
    ],
    suggestedPrompt: "List my recent Google Drive files",
    requiresAuth: true,
    authType: "oauth",
    requirestoken: "google_drive"
  },
  {
    id: "github-tools-mcp-id",
    title: "GitHub Tools",
    description: "Interact with GitHub repositories, issues, pull requests, and code. Use when users ask about 'GitHub repos', 'repository information', 'repo details', 'GitHub files', or need to access code repositories. This connects to GitHub's API to fetch repository data, file contents, and project information.",
    endpoint: "github-tools",
    icon: "github",
    priority: 7, // High priority - developers frequently need GitHub access
    parameters: [
      {
        name: "action",
        type: "string",
        description: "The GitHub action to perform",
        required: true,
        enum: ["get_repository", "get_file_content", "list_files", "get_readme", "search_repositories", "get_branches", "get_commits"]
      },
      {
        name: "owner",
        type: "string",
        description: "Repository owner/organization name",
        required: false
      },
      {
        name: "repository",
        type: "string",
        description: "Repository name",
        required: false
      },
      {
        name: "path",
        type: "string",
        description: "File or directory path",
        required: false
      },
      {
        name: "ref",
        type: "string",
        description: "Branch, tag, or commit SHA (default: main)",
        required: false,
        default: "main"
      },
      {
        name: "query",
        type: "string",
        description: "Search query for repositories",
        required: false
      }
    ],
    isDefault: true,
    default_key: "github-tools",
    category: "Development",
    tags: ["github", "git", "repository", "code", "repos", "commits", "branches"],
    sampleUseCases: [
      "Repository info: 'get repository details for facebook/react', 'show me the zero-loop repo'",
      "File access: 'read the README from a specific repository', 'get package.json from a repo'",
      "Search repos: 'find repositories about machine learning', 'search for React component libraries'",
      "Commit history: 'get latest commits from main branch', 'show commit history'"
    ],
    suggestedPrompt: "Get the README file from a specific GitHub repository",
    requiresAuth: true,
    authType: "api_key",
    requirestoken: "github"
  },
  {
    id: uuidv4(),
    title: "Jira Tools",
    description: "Access and manage Jira projects, issues, and workflows. Use when users ask to 'retrieve projects', 'list projects', 'get projects', 'show my projects', 'what projects do I have', 'search issues', 'create tickets', or any Jira-related tasks. This tool connects to your Jira instance to fetch project information, search issues, create/update tickets, and manage project workflows.",
    endpoint: "jira-tools",
    icon: "jira",
    priority: 6, // Medium-high priority - useful for project management
    parameters: [
      {
        name: "action",
        type: "string",
        description: "The Jira action to perform",
        required: true,
        enum: ["get_project", "create_issue", "update_issue", "search_issues", "get_issue", "list_projects", "get_issue_types", "add_comment"]
      },
      {
        name: "project_key",
        type: "string",
        description: "Jira project key (e.g., 'PROJ', 'DEV')",
        required: false
      },
      {
        name: "issue_key",
        type: "string",
        description: "Jira issue key (e.g., 'PROJ-123')",
        required: false
      },
      {
        name: "summary",
        type: "string",
        description: "Issue summary/title",
        required: false
      },
      {
        name: "description",
        type: "string",
        description: "Issue description",
        required: false
      },
      {
        name: "issue_type",
        type: "string",
        description: "Type of issue",
        required: false,
        enum: ["Bug", "Task", "Story", "Epic", "Subtask"]
      },
      {
        name: "priority",
        type: "string",
        description: "Issue priority",
        required: false,
        enum: ["Highest", "High", "Medium", "Low", "Lowest"]
      },
      {
        name: "assignee",
        type: "string",
        description: "Assignee username or email",
        required: false
      },
      {
        name: "jql",
        type: "string",
        description: "Jira Query Language (JQL) for advanced searches",
        required: false
      },
      {
        name: "comment",
        type: "string",
        description: "Comment text to add to issue",
        required: false
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of results to return (default: 50)",
        required: false,
        default: 50
      }
    ],
    isDefault: true,
    default_key: "jira-tools",
    category: "Project Management",
    tags: ["jira", "project", "issues", "workflow", "agile", "projects", "tickets"],
    sampleUseCases: [
      "List all projects: 'retrieve projects', 'show my projects', 'what projects do I have'",
      "Search for issues: 'find bugs in project ABC', 'show open issues assigned to me'",
      "Get project details: 'tell me about project XYZ', 'what's in the DEV project'",
      "Create new issues: 'create a bug report for login issues'",
      "Update existing tickets: 'update ticket ABC-123 with progress notes'"
    ],
    suggestedPrompt: "List all projects in my Jira instance",
    requiresAuth: true,
    authType: "api_key",
    requirestoken: "jira"
  },
  {
    id: uuidv4(),
    title: "Web Scraper",
    description: "Extract detailed content from web pages by providing a URL. Perfect for getting full article text, news content, or any webpage content when you have a specific URL to scrape.",
    endpoint: "web-scraper",
    icon: "globe",
    priority: 5, // Medium priority - useful but more specialized
    parameters: [
      {
        name: "url",
        type: "string",
        description: "The URL of the webpage to scrape content from",
        required: true
      },
      {
        name: "selector",
        type: "string",
        description: "Optional CSS selector to target specific content (e.g., 'article', '.content', '#main')",
        required: false
      },
      {
        name: "format",
        type: "string",
        description: "Output format for the scraped content",
        required: false,
        default: "markdown",
        enum: ["html", "text", "markdown"]
      },
      {
        name: "includeMetadata",
        type: "boolean",
        description: "Whether to include page metadata (title, description, etc.)",
        required: false,
        default: true
      }
    ],
    isDefault: true,
    default_key: "web-scraper",
    category: "Extraction",
    tags: ["scraper", "web", "content", "extraction", "news"],
    sampleUseCases: [
      "Extract full article content from news websites",
      "Get detailed information from blog posts",
      "Scrape product information from e-commerce sites",
      "Extract content from documentation pages"
    ],
    suggestedPrompt: "Extract the content from this article: https://example.com/article",
    requiresAuth: false
  },
  {
    id: uuidv4(),
    title: "Gmail Tools",
    description: "Manage Gmail emails, send messages, search conversations, and organize your inbox. Use when users ask to 'check emails', 'send an email', 'search my messages', 'read emails', or any Gmail-related tasks. This tool connects to your Gmail account to handle email operations.",
    endpoint: "gmail-tools",
    icon: "mail",
    priority: 8, // High priority - email is crucial
    parameters: [
      {
        name: "action",
        type: "string",
        description: "The Gmail action to perform",
        required: true,
        enum: ["list_emails", "get_email", "send_email", "search_emails", "mark_as_read", "delete_email"]
      },
      {
        name: "messageId",
        type: "string",
        description: "Gmail message ID for specific operations",
        required: false
      },
      {
        name: "to",
        type: "string",
        description: "Recipient email address for sending emails",
        required: false
      },
      {
        name: "cc",
        type: "string",
        description: "CC email addresses (comma-separated)",
        required: false
      },
      {
        name: "bcc",
        type: "string",
        description: "BCC email addresses (comma-separated)",
        required: false
      },
      {
        name: "subject",
        type: "string",
        description: "Email subject line",
        required: false
      },
      {
        name: "body",
        type: "string",
        description: "Email body content",
        required: false
      },
      {
        name: "query",
        type: "string",
        description: "Search query for finding emails",
        required: false
      },
      {
        name: "maxResults",
        type: "number",
        description: "Maximum number of emails to return (default: 10)",
        required: false,
        default: 10
      },
      {
        name: "labelIds",
        type: "array",
        description: "Gmail label IDs to filter by",
        required: false,
        default: []
      }
    ],
    isDefault: true,
    default_key: "gmail-tools",
    category: "Communication",
    tags: ["gmail", "email", "messages", "communication", "inbox"],
    sampleUseCases: [
      "Email management: 'check my recent emails', 'show unread messages'",
      "Send emails: 'send an email to john@example.com', 'compose a message about the meeting'", 
      "Search emails: 'find emails from my boss', 'search for emails about project alpha'",
      "Email actions: 'mark this email as read', 'delete spam messages'"
    ],
    suggestedPrompt: "Check my recent Gmail messages",
    requiresAuth: true,
    authType: "oauth",
    requirestoken: "google_gmail"
  },
  {
    id: uuidv4(),
    title: "Google Calendar",
    description: "Manage Google Calendar events, create meetings, schedule appointments, and view your calendar. Use when users ask to 'check my calendar', 'schedule a meeting', 'create an event', 'what's on my schedule', or any calendar-related tasks.",
    endpoint: "google-calendar-tools",
    icon: "calendar",
    priority: 8, // High priority - scheduling is important
    parameters: [
      {
        name: "action",
        type: "string",
        description: "The Calendar action to perform",
        required: true,
        enum: ["list_events", "create_event", "update_event", "delete_event", "get_calendars", "get_event"]
      },
      {
        name: "calendarId",
        type: "string",
        description: "Calendar ID (default: 'primary' for main calendar)",
        required: false,
        default: "primary"
      },
      {
        name: "eventId",
        type: "string",
        description: "Event ID for specific operations",
        required: false
      },
      {
        name: "summary",
        type: "string",
        description: "Event title/summary",
        required: false
      },
      {
        name: "description",
        type: "string",
        description: "Event description",
        required: false
      },
      {
        name: "location",
        type: "string",
        description: "Event location",
        required: false
      },
      {
        name: "startTime",
        type: "string",
        description: "Event start time (ISO format)",
        required: false
      },
      {
        name: "endTime",
        type: "string",
        description: "Event end time (ISO format)",
        required: false
      },
      {
        name: "attendees",
        type: "array",
        description: "Array of attendee email addresses",
        required: false,
        default: []
      },
      {
        name: "maxResults",
        type: "number",
        description: "Maximum number of events to return (default: 10)",
        required: false,
        default: 10
      },
      {
        name: "timeMin",
        type: "string",
        description: "Minimum time to search from (ISO format)",
        required: false
      },
      {
        name: "timeMax",
        type: "string",
        description: "Maximum time to search to (ISO format)",
        required: false
      }
    ],
    isDefault: true,
    default_key: "google-calendar-tools",
    category: "Productivity",
    tags: ["calendar", "events", "meetings", "schedule", "appointments"],
    sampleUseCases: [
      "View schedule: 'what's on my calendar today', 'show this week's events'",
      "Create events: 'schedule a meeting with the team tomorrow at 2pm'",
      "Manage events: 'move my dentist appointment to Friday', 'cancel the 3pm meeting'",
      "Calendar overview: 'show all my calendars', 'check my availability'"
    ],
    suggestedPrompt: "Show me my calendar events for today",
    requiresAuth: true,
    authType: "oauth",
    requirestoken: "google_calendar"
  },
  {
    id: uuidv4(),
    title: "Google Sheets",
    description: "Access and manage Google Sheets data, create spreadsheets, update cells, and manipulate spreadsheet content. Use when users ask to 'update spreadsheet', 'get data from sheets', 'create a spreadsheet', or any Google Sheets operations.",
    endpoint: "google-sheets-tools",
    icon: "table",
    priority: 7, // High priority for data management
    parameters: [
      {
        name: "action",
        type: "string",
        description: "The Sheets action to perform",
        required: true,
        enum: ["get_sheet_data", "update_cells", "append_data", "create_sheet", "get_spreadsheets", "clear_range"]
      },
      {
        name: "spreadsheetId",
        type: "string",
        description: "Google Sheets spreadsheet ID",
        required: false
      },
      {
        name: "range",
        type: "string",
        description: "Cell range (e.g., 'A1:C10', 'Sheet1!A1:B5')",
        required: false,
        default: "A1:Z1000"
      },
      {
        name: "values",
        type: "array",
        description: "2D array of values to write to cells",
        required: false,
        default: []
      },
      {
        name: "title",
        type: "string",
        description: "Title for new spreadsheets",
        required: false,
        default: "New Spreadsheet"
      }
    ],
    isDefault: true,
    default_key: "google-sheets-tools",
    category: "Data Management",
    tags: ["sheets", "spreadsheet", "data", "excel", "tables", "cells"],
    sampleUseCases: [
      "Data retrieval: 'get data from my budget spreadsheet', 'show me the sales numbers'",
      "Data entry: 'add a new row to my expense tracker', 'update the Q4 revenue'",
      "Spreadsheet management: 'create a new project planning sheet'",
      "Data manipulation: 'clear the old data from range A1:C10'"
    ],
    suggestedPrompt: "Get data from a specific range in my Google Sheet",
    requiresAuth: true,
    authType: "oauth",
    requirestoken: "google_sheets"
  },
  {
    id: uuidv4(),
    title: "Google Docs",
    description: "Create and manage Google Docs documents, edit content, and manipulate document text. Use when users ask to 'create a document', 'edit my doc', 'add content to document', or any Google Docs operations.",
    endpoint: "google-docs-tools",
    icon: "file-text",
    priority: 7, // High priority for document management
    parameters: [
      {
        name: "action",
        type: "string",
        description: "The Docs action to perform",
        required: true,
        enum: ["get_document", "create_document", "update_content", "append_content", "replace_text"]
      },
      {
        name: "documentId",
        type: "string",
        description: "Google Docs document ID",
        required: false
      },
      {
        name: "title",
        type: "string",
        description: "Title for new documents",
        required: false,
        default: "Untitled Document"
      },
      {
        name: "content",
        type: "string",
        description: "Text content to add or update",
        required: false
      },
      {
        name: "insertIndex",
        type: "number",
        description: "Position to insert content (default: 1 for beginning)",
        required: false,
        default: 1
      },
      {
        name: "searchText",
        type: "string",
        description: "Text to search for when replacing",
        required: false
      },
      {
        name: "replaceText",
        type: "string",
        description: "Text to replace with",
        required: false
      }
    ],
    isDefault: true,
    default_key: "google-docs-tools",
    category: "Document Management",
    tags: ["docs", "documents", "writing", "text", "content"],
    sampleUseCases: [
      "Document creation: 'create a new meeting notes document'",
      "Content editing: 'add this summary to my project doc', 'append notes to the document'",
      "Text replacement: 'replace all instances of old project name with new name'",
      "Document retrieval: 'show me the content of my proposal document'"
    ],
    suggestedPrompt: "Create a new Google Doc for meeting notes",
    requiresAuth: true,
    authType: "oauth",
    requirestoken: "google_docs"
  },
  {
    id: uuidv4(),
    title: "Google Contacts",
    description: "Manage Google Contacts, add new contacts, search your contact list, and update contact information. Use when users ask to 'add a contact', 'find someone's email', 'update contact info', or any contact management tasks.",
    endpoint: "google-contacts-tools",
    icon: "users",
    priority: 6, // Medium priority for contact management
    parameters: [
      {
        name: "action",
        type: "string",
        description: "The Contacts action to perform",
        required: true,
        enum: ["list_contacts", "create_contact", "update_contact", "search_contacts", "get_contact", "delete_contact"]
      },
      {
        name: "resourceName",
        type: "string",
        description: "Contact resource name for specific operations",
        required: false
      },
      {
        name: "firstName",
        type: "string",
        description: "Contact first name",
        required: false
      },
      {
        name: "lastName",
        type: "string",
        description: "Contact last name",
        required: false
      },
      {
        name: "email",
        type: "string",
        description: "Contact email address",
        required: false
      },
      {
        name: "phone",
        type: "string",
        description: "Contact phone number",
        required: false
      },
      {
        name: "organization",
        type: "string",
        description: "Contact organization/company",
        required: false
      },
      {
        name: "query",
        type: "string",
        description: "Search query for finding contacts",
        required: false
      },
      {
        name: "maxResults",
        type: "number",
        description: "Maximum number of contacts to return (default: 50)",
        required: false,
        default: 50
      }
    ],
    isDefault: true,
    default_key: "google-contacts-tools",
    category: "Contact Management",
    tags: ["contacts", "people", "address book", "phone", "email"],
    sampleUseCases: [
      "Contact search: 'find John Smith in my contacts', 'search for contacts at Google'",
      "Add contacts: 'add a new contact for Jane Doe with email jane@example.com'",
      "Contact management: 'update Sarah's phone number', 'show all my contacts'",
      "Contact details: 'get contact info for my colleague Mike'"
    ],
    suggestedPrompt: "Search my contacts for a specific person",
    requiresAuth: true,
    authType: "oauth",
    requirestoken: "google_contacts"
  }
];
