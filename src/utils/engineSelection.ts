
import { Domain } from '../types/intelligence';
import { domainEngines } from '../engines/domainEngines';

/**
 * Analyzes a domain's content to determine the most appropriate engine.
 * @param domain - The domain to analyze
 * @returns The engine type string (e.g., 'logic', 'programming', etc.)
 */
export function determineEngineType(domain: Domain): string {
  // If engine type is already defined, use it
  if (domain.engineType && domainEngines[domain.engineType]) {
    return domain.engineType;
  }

  // Keywords map for engine selection
  const engineKeywords: Record<string, string[]> = {
    'logic': ['logic', 'reasoning', 'inference', 'deduction', 'syllogism', 'argument'],
    'programming': ['code', 'programming', 'regex', 'function', 'algorithm', 'syntax', 'developer'],
    'web-knowledge': ['web', 'knowledge', 'search', 'information', 'article', 'research'],
    'ai-reasoning': ['ai', 'intelligence', 'machine learning', 'nlp', 'neural', 'model', 'reasoning'],
    'math': ['math', 'mathematics', 'equation', 'calculate', 'algebra', 'geometry', 'calculus'],
    'writing': ['writing', 'essay', 'paragraph', 'narrative', 'story', 'article', 'blog'],
    'business': ['business', 'market', 'strategy', 'company', 'product', 'customer', 'finance']
  };

  // Combine domain texts for analysis
  const domainText = [
    domain.name,
    domain.shortDesc,
    domain.description
  ].join(' ').toLowerCase();

  // Count matches for each engine type
  const matchCounts: Record<string, number> = {};
  
  Object.entries(engineKeywords).forEach(([engine, keywords]) => {
    matchCounts[engine] = keywords.reduce((count, keyword) => {
      return count + (domainText.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
  });

  // Find the engine with the most keyword matches
  let bestEngine = 'logic'; // Default
  let maxCount = 0;

  Object.entries(matchCounts).forEach(([engine, count]) => {
    if (count > maxCount) {
      maxCount = count;
      bestEngine = engine;
    }
  });

  return bestEngine;
}

/**
 * Gets the appropriate domain engine for a domain, automatically determining
 * the best engine if one isn't explicitly specified.
 * @param domain - The domain to get the engine for
 * @returns The domain engine instance
 */
export function getDomainEngine(domain: Domain) {
  const engineType = determineEngineType(domain);
  return domainEngines[engineType] || domainEngines['logic'];
}
