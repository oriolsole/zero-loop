
import { Domain } from '../types/intelligence';
import { domainEngines } from '../engines/domainEngines';

/**
 * Detection model that analyzes domain content to determine the most appropriate engine.
 * 
 * This model uses several indicators to choose the right engine:
 * 1. Domain name keywords
 * 2. Domain description keywords
 * 3. Existing tasks in the domain history
 */
export class EngineDetectionModel {
  // Keywords mapping to engine types
  private static engineKeywords = {
    'logic': ['logic', 'reasoning', 'inference', 'deduction', 'syllogism', 'argument', 'critical thinking'],
    'programming': ['code', 'programming', 'regex', 'function', 'algorithm', 'syntax', 'developer', 'software'],
    'web-knowledge': ['web', 'knowledge', 'search', 'information', 'article', 'research', 'data'],
    'ai-reasoning': ['ai', 'intelligence', 'machine learning', 'nlp', 'neural', 'model', 'reasoning'],
    'math': ['math', 'mathematics', 'equation', 'calculate', 'algebra', 'geometry', 'calculus', 'number'],
    'writing': ['writing', 'essay', 'paragraph', 'narrative', 'story', 'article', 'blog', 'creative'],
    'business': ['business', 'market', 'strategy', 'company', 'product', 'customer', 'finance']
  };

  /**
   * Analyzes a domain and determines the most appropriate engine.
   * Returns the engine type string.
   */
  public static detectEngineType(domain: Domain): string {
    // If the domain already has an engine type specified, use it
    if (domain.engineType && domainEngines[domain.engineType]) {
      return domain.engineType;
    }
    
    // Combine all relevant text from the domain for analysis
    const textToAnalyze = [
      domain.name,
      domain.shortDesc,
      domain.description,
      // Include sample tasks from current loop
      ...domain.currentLoop
        .filter(step => step.type === 'task')
        .map(step => step.content)
    ].filter(Boolean).join(' ').toLowerCase();
    
    // Count matches for each engine type
    const scores: Record<string, number> = {};
    
    Object.entries(this.engineKeywords).forEach(([engineType, keywords]) => {
      scores[engineType] = keywords.reduce((score, keyword) => {
        // Count occurrences of each keyword in the text
        const regex = new RegExp(keyword.toLowerCase(), 'g');
        const matches = textToAnalyze.match(regex);
        return score + (matches ? matches.length : 0);
      }, 0);
    });
    
    // Get the engine with the highest score
    const entries = Object.entries(scores);
    if (entries.length === 0) {
      return 'logic'; // Default
    }
    
    // Sort by score in descending order
    entries.sort((a, b) => b[1] - a[1]);
    
    // Log for debugging
    console.log("Engine detection scores:", entries);
    
    // Return the engine type with the highest score, or logic as default
    return entries[0][1] > 0 ? entries[0][0] : 'logic';
  }
  
  /**
   * Updates a domain with the detected engine type if it doesn't have one
   */
  public static assignEngineType(domain: Domain): Domain {
    if (!domain.engineType) {
      return {
        ...domain,
        engineType: this.detectEngineType(domain)
      };
    }
    return domain;
  }
}
