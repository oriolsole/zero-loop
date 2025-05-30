
import { Search, Github, Code, Wrench, Globe, FileText, Terminal, FileSearch, Book, Brain } from 'lucide-react';
import JiraIcon from '@/components/icons/JiraIcon';

export const getToolIcon = (toolName: string) => {
  const toolLower = toolName.toLowerCase();
  
  if (toolLower.includes('search') || toolLower.includes('google') || toolLower.includes('web search')) {
    return Search;
  }
  if (toolLower.includes('github')) {
    return Github;
  }
  if (toolLower.includes('knowledge') || toolLower.includes('database')) {
    return Book;
  }
  if (toolLower.includes('code') || toolLower.includes('analysis')) {
    return Code;
  }
  if (toolLower.includes('web') || toolLower.includes('scraper') || toolLower.includes('scraping')) {
    return Globe;
  }
  if (toolLower.includes('jira')) {
    return JiraIcon;
  }
  if (toolLower.includes('ai') || toolLower.includes('reasoning') || toolLower.includes('agent') || toolLower.includes('learning')) {
    return Brain;
  }
  if (toolLower.includes('command') || toolLower.includes('terminal')) {
    return Terminal;
  }
  if (toolLower.includes('file') || toolLower.includes('document')) {
    return FileSearch;
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
    'knowledge_search': 'Knowledge Search',
    'knowledge_retrieval': 'Knowledge Retrieval',
    'web_scraper': 'Web Scraping',
    'jira_search': 'Jira Search',
    'ai_reasoning': 'AI Reasoning',
    'code_analysis': 'Code Analysis',
    'unified_agent': 'Unified Agent'
  };
  
  return displayNames[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getToolColor = (toolName: string): string => {
  const toolLower = toolName.toLowerCase();
  
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
