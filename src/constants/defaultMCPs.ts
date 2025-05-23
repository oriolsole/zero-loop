
// Define your default MCPs
import { MCP } from '@/types/mcp';
import { v4 as uuidv4 } from 'uuid';

// Define your default MCPs
export const defaultMCPs: MCP[] = [
  {
    id: "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
    title: "Google Search",
    description: "Search the web using Google Custom Search API",
    endpoint: "https://api.example.com/google-search",
    icon: "search",
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
      }
    ],
    isDefault: true,
    default_key: "google-search",
    category: "Search",
    tags: ["search", "web"],
    suggestedPrompt: "Search for information about artificial intelligence",
    requiresAuth: true,
    authType: "api_key",
    authKeyName: "google_api_key",
    requirestoken: "google" // Fixed: use requirestoken instead of requiresToken
  },
  {
    id: "2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q",
    title: "Weather Forecast",
    description: "Get weather forecast for a location",
    endpoint: "https://api.example.com/weather",
    icon: "cloud",
    parameters: [
      {
        name: "location",
        type: "string",
        description: "City name or coordinates",
        required: true
      },
      {
        name: "days",
        type: "number",
        description: "Number of days to forecast",
        required: false,
        default: 3
      }
    ],
    isDefault: true,
    default_key: "weather-forecast",
    category: "Weather",
    tags: ["weather", "forecast"],
    suggestedPrompt: "Get the weather forecast for New York",
    requiresAuth: true,
    authType: "api_key",
    authKeyName: "weather_api_key",
    requirestoken: "weather" // Fixed: use requirestoken instead of requiresToken
  },
  {
    id: "3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r",
    title: "Text Summarization",
    description: "Summarize long text content",
    endpoint: "https://api.example.com/summarize",
    icon: "file-text",
    parameters: [
      {
        name: "text",
        type: "string",
        description: "The text to summarize",
        required: true
      },
      {
        name: "length",
        type: "string",
        description: "Desired summary length",
        required: false,
        default: "medium",
        enum: ["short", "medium", "long"]
      }
    ],
    isDefault: true,
    default_key: "text-summarization",
    category: "Text Processing",
    tags: ["text", "summarization", "nlp"],
    suggestedPrompt: "Summarize this article about climate change",
    requiresAuth: false
  },
  {
    id: "4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s",
    title: "Image Generation",
    description: "Generate images from text descriptions",
    endpoint: "https://api.example.com/generate-image",
    icon: "image",
    parameters: [
      {
        name: "prompt",
        type: "string",
        description: "Text description of the image",
        required: true
      },
      {
        name: "style",
        type: "string",
        description: "Art style for the image",
        required: false,
        default: "realistic",
        enum: ["realistic", "cartoon", "abstract", "sketch"]
      },
      {
        name: "size",
        type: "string",
        description: "Image size",
        required: false,
        default: "medium",
        enum: ["small", "medium", "large"]
      }
    ],
    isDefault: true,
    default_key: "image-generation",
    category: "Creative",
    tags: ["image", "generation", "ai"],
    suggestedPrompt: "Generate an image of a sunset over mountains",
    requiresAuth: true,
    authType: "api_key",
    authKeyName: "openai_api_key",
    requirestoken: "openai" // Fixed: use requirestoken instead of requiresToken
  },
  {
    id: "5e6f7g8h-9i0j-1k2l-3m4n-5o6p7q8r9s0t",
    title: "Code Explanation",
    description: "Explain code snippets in plain English",
    endpoint: "https://api.example.com/explain-code",
    icon: "code",
    parameters: [
      {
        name: "code",
        type: "string",
        description: "The code snippet to explain",
        required: true
      },
      {
        name: "language",
        type: "string",
        description: "Programming language",
        required: false,
        default: "auto-detect"
      },
      {
        name: "detail",
        type: "string",
        description: "Level of detail in explanation",
        required: false,
        default: "medium",
        enum: ["basic", "medium", "detailed"]
      }
    ],
    isDefault: true,
    default_key: "code-explanation",
    category: "Development",
    tags: ["code", "explanation", "programming"],
    suggestedPrompt: "Explain this JavaScript function that calculates Fibonacci numbers",
    requiresAuth: false
  },
  // Knowledge search MCP with updated endpoint to use our Edge Function proxy
  {
    id: uuidv4(), // Generate a new UUID for this MCP
    title: "Knowledge Base Search",
    description: "Search across your knowledge base with semantic search",
    endpoint: "knowledge-proxy", // Updated to use our new Edge Function
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
      }
    ]
  }
];
