
/**
 * GitHub URL parsing and detection utilities
 */

/**
 * Extracts GitHub repository information from a URL with improved parsing
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // First try to extract from a full URL
  const githubUrlRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s]+)(?:\/.*)?/i;
  const match = url.match(githubUrlRegex);
  
  if (match) {
    const owner = match[1];
    let repo = match[2];
    
    // Remove .git suffix if present
    repo = repo.replace(/\.git$/, '');
    
    // Remove any trailing text that might not be part of the repo name
    // Split on whitespace or special characters and take the first part
    repo = repo.split(/[\s?#]/).filter(part => part.length > 0)[0];
    
    // Validate that owner and repo don't contain spaces or invalid characters
    if (!/^[a-zA-Z0-9._-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
      return null;
    }
    
    return { owner, repo };
  }
  
  return null;
}

/**
 * Detects if the message contains GitHub URLs or GitHub-related requests with improved detection
 */
export function detectGitHubRequest(message: string): { isGitHubRequest: boolean; githubInfo?: { owner: string; repo: string } } {
  const lowerMessage = message.toLowerCase();
  
  // Check for GitHub URLs first
  const githubInfo = parseGitHubUrl(message);
  if (githubInfo) {
    return { isGitHubRequest: true, githubInfo };
  }
  
  // Check for GitHub-related keywords
  const githubKeywords = [
    'github',
    'repository',
    'repo',
    'read this repository',
    'examine repository',
    'analyze repository',
    'github.com'
  ];
  
  const isGitHubRequest = githubKeywords.some(keyword => lowerMessage.includes(keyword));
  
  return { isGitHubRequest };
}
