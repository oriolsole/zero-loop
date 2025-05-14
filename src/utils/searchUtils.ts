
/**
 * Highlights search matches in text by wrapping them in a span with highlight styling
 * @param text The text to search within
 * @param searchTerm The search term to highlight
 * @returns HTML string with highlight spans
 */
export function highlightSearchMatch(text: string, searchTerm: string): string {
  if (!searchTerm || !text) return text;
  
  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  return text.replace(regex, '<span class="bg-yellow-100 dark:bg-yellow-900 text-foreground rounded px-0.5">$1</span>');
}

/**
 * Escapes special regex characters in a string
 * @param string The string to escape
 * @returns Escaped string safe for use in regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
