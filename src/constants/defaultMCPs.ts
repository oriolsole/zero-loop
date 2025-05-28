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
    icon: "search",
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
    id: "github-tools-mcp-id",
    title: "GitHub Tools",
    description: "Interact with GitHub repositories, issues, pull requests, and code. Use when users ask about 'GitHub repos', 'repository information', 'repo details', 'GitHub files', or need to access code repositories. This connects to GitHub's API to fetch repository data, file contents, and project information.",
    endpoint: "github-tools",
    icon: "github",
    priority: 8, // High priority - developers frequently need GitHub access
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
    icon: "kanban-square",
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
    icon: "file-search",
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
  }
];
