// Define your default MCPs
import { MCP } from '@/types/mcp';
import { v4 as uuidv4 } from 'uuid';

// Define your default MCPs with working local endpoints
export const defaultMCPs: MCP[] = [
  {
    id: "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    title: "Web Search",
    description: "Search the web using Google Custom Search API to find relevant information across the internet",
    endpoint: "google-search",
    icon: "search",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query to find relevant web results",
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
    tags: ["search", "web", "google", "information"],
    sampleUseCases: [
      "Search for latest news on a topic",
      "Find research papers or articles", 
      "Look up current information about companies or technologies",
      "Find tutorials or how-to guides"
    ],
    suggestedPrompt: "Search for information about artificial intelligence trends 2024",
    requiresAuth: false,
    requirestoken: "google"
  },
  {
    id: uuidv4(),
    title: "Web Scraper",
    description: "Extract detailed content from web pages by providing a URL. Perfect for getting full article text, news content, or any webpage content.",
    endpoint: "web-scraper",
    icon: "file-search",
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
    id: "github-tools-mcp-id",
    title: "GitHub Tools",
    description: "Interact with GitHub repositories, issues, pull requests, and more",
    endpoint: "github-tools",
    icon: "github",
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
    tags: ["github", "git", "repository", "code"],
    sampleUseCases: [
      "Get repository information and structure",
      "Read file contents from any public repository",
      "Search for repositories by topic or name",
      "Get commit history and branch information"
    ],
    suggestedPrompt: "Get the README file from a specific GitHub repository",
    requiresAuth: true,
    authType: "api_key",
    requirestoken: "github"
  },
  {
    id: uuidv4(),
    title: "Knowledge Base Search",
    description: "Search across your knowledge base with semantic search",
    endpoint: "knowledge-proxy",
    icon: "search",
    default_key: "knowledge-search-v2",
    isDefault: true,
    category: "Knowledge",
    tags: ["search", "knowledge", "vector"],
    suggestedPrompt: "Search for information about artificial intelligence",
    requiresAuth: true,
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query",
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
    ]
  },
  {
    id: uuidv4(),
    title: "Jira Tools",
    description: "Interact with Jira projects, issues, and workflows. Create, update, search issues and manage project data.",
    endpoint: "jira-tools",
    icon: "kanban-square",
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
    tags: ["jira", "project", "issues", "workflow", "agile"],
    sampleUseCases: [
      "Create a new bug report in project ABC",
      "Search for open issues assigned to me",
      "Get project information and available issue types",
      "Update issue status and add progress comments",
      "List all projects and their details",
      "Search issues using JQL queries"
    ],
    suggestedPrompt: "Create a new bug issue in project XYZ with high priority",
    requiresAuth: true,
    authType: "api_key",
    requirestoken: "jira"
  }
];
