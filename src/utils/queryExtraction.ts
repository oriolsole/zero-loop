
/**
 * Enhanced query extraction utilities for better search term identification
 */

/**
 * Extracts quoted terms from a query string
 */
function extractQuotedTerms(query: string): string[] {
  const quotedMatches = query.match(/"([^"]+)"/g);
  return quotedMatches ? quotedMatches.map(match => match.replace(/"/g, '')) : [];
}

/**
 * Extracts search intent and main search terms from conversational queries
 */
export function extractSearchTerms(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  // First, try to extract quoted terms - these are usually the most important
  const quotedTerms = extractQuotedTerms(query);
  if (quotedTerms.length > 0) {
    return quotedTerms.join(' ');
  }
  
  // Clean the query first
  let cleaned = query.toLowerCase().trim();
  
  // Remove common conversational prefixes and suffixes
  const conversationalPrefixes = [
    'can you search for',
    'can you search',
    'can you find',
    'can you look for',
    'search for',
    'search',
    'find',
    'look for',
    'lookup',
    'get information about',
    'information about',
    'tell me about',
    'what is',
    'who is',
    'about'
  ];
  
  const conversationalSuffixes = [
    'in our knowledge base',
    'in the knowledge base',
    'in our database',
    'in the database',
    'please',
    'thanks',
    'thank you'
  ];
  
  // Remove prefixes
  for (const prefix of conversationalPrefixes) {
    const pattern = new RegExp(`^${prefix}\\s+`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove suffixes
  for (const suffix of conversationalSuffixes) {
    const pattern = new RegExp(`\\s+${suffix}$`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove question marks and extra punctuation at the end
  cleaned = cleaned.replace(/[?!.]+$/, '').trim();
  
  // If we're left with nothing meaningful, try to extract the most important words
  if (!cleaned || cleaned.length < 2) {
    // Extract words that are longer than 2 characters and not common stop words
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'our', 'can', 'you'];
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return words.join(' ');
  }
  
  return cleaned;
}

/**
 * Determines if a query contains search intent
 */
export function hasSearchIntent(query: string): boolean {
  if (!query) return false;
  
  const searchIndicators = [
    'search', 'find', 'look', 'lookup', 'get', 'information', 'about', 
    'what', 'who', 'where', 'when', 'how', 'why', 'tell me'
  ];
  
  const lowerQuery = query.toLowerCase();
  return searchIndicators.some(indicator => lowerQuery.includes(indicator));
}
