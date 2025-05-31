
import { Search, Github, Code, Wrench, Globe, FileText, Terminal, FileSearch, Book, Brain, Database, HardDrive, FolderOpen, Library } from 'lucide-react';
import JiraIcon from '@/components/icons/JiraIcon';

export const getToolIcon = (toolName: string) => {
  const toolLower = toolName.toLowerCase();
  
  // Most specific matches first - exact tool names
  if (toolLower === 'knowledge-search-v2' || toolLower === 'knowledge_search' || toolLower === 'knowledge_retrieval') {
    return Database;
  }
  
  if (toolLower === 'github-search' || toolLower === 'github_search') {
    return Github;
  }
  
  if (toolLower === 'jira-search' || toolLower === 'jira_search') {
    return JiraIcon;
  }
  
  // Google Drive specific tools
  if (toolLower.includes('google-drive') || toolLower.includes('drive')) {
    return HardDrive;
  }
  
  // GitHub tools (broader match after specific search)
  if (toolLower.includes('github')) {
    return Github;
  }
  
  // Jira tools (broader match after specific search)
  if (toolLower.includes('jira')) {
    return JiraIcon;
  }
  
  // Knowledge and database tools - use Database for better distinction
  if (toolLower.includes('knowledge') || toolLower.includes('database')) {
    return Database;
  }
  
  // Library and document storage
  if (toolLower.includes('library') || toolLower.includes('upload') || toolLower.includes('storage')) {
    return Library;
  }
  
  // AI and reasoning tools
  if (toolLower.includes('ai') || toolLower.includes('reasoning') || toolLower.includes('agent') || toolLower.includes('learning')) {
    return Brain;
  }
  
  // Code analysis tools
  if (toolLower.includes('code') || toolLower.includes('analysis')) {
    return Code;
  }
  
  // Web scraping tools
  if (toolLower.includes('scraper') || toolLower.includes('scraping')) {
    return Globe;
  }
  
  // Pure web search tools (more restrictive - only for actual web search)
  if (toolLower === 'web_search' || toolLower === 'google_search' || toolLower === 'web search' || toolLower === 'google search') {
    return Search;
  }
  
  // Terminal and command tools
  if (toolLower.includes('command') || toolLower.includes('terminal')) {
    return Terminal;
  }
  
  // File and document tools
  if (toolLower.includes('file') || toolLower.includes('document')) {
    return FileSearch;
  }
  
  // Folder operations
  if (toolLower.includes('folder') || toolLower.includes('directory')) {
    return FolderOpen;
  }
  
  // Default fallback
  return Wrench;
};

export const getToolDisplayName = (toolName: string): string => {
  const displayNames: Record<string, string> = {
    'google_search': 'Web Search',
    'web_search': 'Web Search',
    'github_search': 'GitHub Search',
    'github_analysis': 'GitHub Analysis',
    'github_tools': 'GitHub Tools',
    'google-drive-tools': 'Google Drive',
    'knowledge_search': 'Knowledge Search',
    'knowledge-search-v2': 'Knowledge Search',
    'knowledge_retrieval': 'Knowledge Retrieval',
    'web_scraper': 'Web Scraping',
    'jira_search': 'Jira Search',
    'jira-tools': 'Jira Tools',
    'ai_reasoning': 'AI Reasoning',
    'code_analysis': 'Code Analysis',
    'unified_agent': 'Unified Agent'
  };
  
  return displayNames[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getToolColor = (toolName: string): string => {
  const toolLower = toolName.toLowerCase();
  
  // Google Drive specific styling
  if (toolLower.includes('google-drive') || toolLower.includes('drive')) {
    return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/20 dark:border-yellow-800/30';
  }
  
  if (toolLower.includes('search') || toolLower.includes('google') || toolLower.includes('web search')) {
    return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/20 dark:border-blue-800/30';
  }
  if (toolLower.includes('github')) {
    return 'text-gray-700 bg-gray-50 border-gray-200 dark:text-gray-300 dark:bg-gray-950/20 dark:border-gray-800/30';
  }
  if (toolLower.includes('knowledge') || toolLower.includes('database')) {
    return 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/20 dark:border-purple-800/30';
  }
  if (toolLower.includes('code') || toolLower.includes('analysis')) {
    return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/20 dark:border-green-800/30';
  }
  if (toolLower.includes('web') || toolLower.includes('scraper') || toolLower.includes('scraping')) {
    return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/20 dark:border-orange-800/30';
  }
  if (toolLower.includes('jira')) {
    return 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/20 dark:border-indigo-800/30';
  }
  if (toolLower.includes('ai') || toolLower.includes('reasoning') || toolLower.includes('agent')) {
    return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-800/30';
  }
  
  return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-950/20 dark:border-slate-800/30';
};
