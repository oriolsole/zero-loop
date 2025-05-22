
import { MCP } from "@/types/mcp";
import { v4 as uuidv4 } from "uuid";

// Helper function to generate deterministic UUIDs from strings
// This will replace our previous non-UUID format with valid UUIDs
function generateConsistentId(name: string): string {
  // Create a namespace UUID (using v5 would be better for this, but v4 works for now)
  return uuidv4();
}

// Extended MCP type to include additional metadata for default MCPs
export interface DefaultMCP extends Omit<MCP, 'id' | 'created_at' | 'updated_at'> {
  id: string;
  default_key: string; // New field to store the readable identifier
  isDefault: boolean;
  category: string;
  tags: string[];
  suggestedPrompt: string;
  sampleUseCases: string[];
  requiresAuth?: boolean;
  authType?: 'api_key' | 'oauth' | 'basic';
  authKeyName?: string;
}

// Pre-configured MCPs that will be seeded into the database
export const defaultMCPs: DefaultMCP[] = [
  {
    id: generateConsistentId("github-tools"),
    default_key: "github-tools", // Store the readable identifier
    title: "GitHub Tools",
    description: "Interact with GitHub repositories, issues, pull requests, and more.",
    endpoint: "https://api.zeroloop.ai/mcp/github",
    icon: "github",
    isDefault: true,
    category: "development",
    tags: ["git", "development", "collaboration"],
    requiresAuth: true,
    authType: "api_key",
    authKeyName: "GITHUB_PAT",
    parameters: [
      {
        name: "action",
        type: "string",
        description: "The GitHub action to perform",
        required: true,
        enum: ["list_issues", "create_issue", "list_repos", "create_pr", "get_readme"]
      },
      {
        name: "repo",
        type: "string",
        description: "Repository name in 'owner/repo' format",
        required: true
      },
      {
        name: "data",
        type: "object",
        description: "Additional data for the action",
        required: false
      }
    ],
    suggestedPrompt: "Create an issue on the repository for this bug",
    sampleUseCases: [
      "List all open issues in repository user/repo",
      "Create a pull request to fix a typo in the README",
      "Get the README content from a specific repository"
    ]
  },
  {
    id: generateConsistentId("knowledge-search"),
    default_key: "knowledge-search",
    title: "Knowledge Search",
    description: "Search across ZeroLoop knowledge nodes, web resources, and embedded knowledge.",
    endpoint: "https://api.zeroloop.ai/mcp/knowledge",
    icon: "search",
    isDefault: true,
    category: "knowledge",
    tags: ["search", "knowledge", "retrieval"],
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The search query",
        required: true
      },
      {
        name: "sources",
        type: "array",
        description: "Knowledge sources to search (default: all)",
        required: false,
        enum: ["nodes", "web", "chunks"]
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of results to return",
        required: false,
        default: 5
      }
    ],
    suggestedPrompt: "Search for information about transformer neural networks",
    sampleUseCases: [
      "Find all knowledge nodes related to machine learning",
      "Search the web for recent papers on reinforcement learning",
      "Retrieve information about LLM prompt engineering"
    ]
  },
  {
    id: generateConsistentId("file-system"),
    default_key: "file-system",
    title: "File System",
    description: "Interact with the local file system to read, write, and manage files.",
    endpoint: "https://api.zeroloop.ai/mcp/filesystem",
    icon: "folder",
    isDefault: true,
    category: "system",
    tags: ["filesystem", "io", "storage"],
    requiresAuth: true,
    authType: "api_key",
    authKeyName: "FS_ACCESS_KEY",
    parameters: [
      {
        name: "action",
        type: "string",
        description: "The filesystem action to perform",
        required: true,
        enum: ["read", "write", "list", "delete", "mkdir"]
      },
      {
        name: "path",
        type: "string",
        description: "File or directory path",
        required: true
      },
      {
        name: "content",
        type: "string",
        description: "File content for write operations",
        required: false
      }
    ],
    suggestedPrompt: "Read the contents of my project's README.md file",
    sampleUseCases: [
      "List all files in the current directory",
      "Read the content of a specific file",
      "Create a new directory for test files"
    ]
  },
  {
    id: generateConsistentId("database-query"),
    default_key: "database-query",
    title: "Database Query",
    description: "Execute SQL queries against connected databases.",
    endpoint: "https://api.zeroloop.ai/mcp/database",
    icon: "plus",
    isDefault: true,
    category: "database",
    tags: ["sql", "database", "query"],
    requiresAuth: true,
    authType: "api_key",
    authKeyName: "DB_ACCESS_KEY",
    parameters: [
      {
        name: "connection",
        type: "string",
        description: "Database connection identifier",
        required: true
      },
      {
        name: "query",
        type: "string",
        description: "SQL query to execute",
        required: true
      },
      {
        name: "params",
        type: "array",
        description: "Query parameters",
        required: false
      }
    ],
    suggestedPrompt: "Run a query to get all knowledge nodes created in the past week",
    sampleUseCases: [
      "Get the most recently added knowledge nodes",
      "Count how many learning loops have been completed",
      "Find all connections between specific knowledge nodes"
    ]
  }
];

// Export a function to get a default MCP by ID
export function getDefaultMCPById(id: string): DefaultMCP | undefined {
  return defaultMCPs.find(mcp => mcp.id === id);
}

// Export a function to get a default MCP by its default_key
export function getDefaultMCPByKey(key: string): DefaultMCP | undefined {
  return defaultMCPs.find(mcp => mcp.default_key === key);
}
