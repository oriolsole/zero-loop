// Knowledge Search Engine - Specialized domain engine for searching across knowledge sources
import { DomainEngine, DomainEngineMetadata, ExternalSource } from '../types/intelligence';

// Engine metadata for UI display and configuration
export const knowledgeSearchEngineMetadata: DomainEngineMetadata = {
  id: 'knowledge-search',
  name: 'Knowledge Search',
  description: 'Search across all knowledge sources including knowledge base, nodes, and web',
  icon: 'search',
  sources: ['knowledge', 'web'],
  color: 'blue',
  capabilities: [
    'Semantic search across knowledge base',
    'Text-based matching',
    'Web search integration',
    'Knowledge node integration',
    'Multi-source ranking'
  ],
  category: 'knowledge',
  version: '1.0.0',
  author: 'ZeroLoop',
};

// Helper functions for type safety
function isArrayWithLength<T>(value: any): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

function ensureNumber(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  
  // Try to convert to number if it's a string
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  // Default fallback
  return 0;
}

// Main knowledge search engine implementation
export const knowledgeSearchEngine: DomainEngine = {
  // Generate task/query examples for this domain
  generateTask: async () => {
    const examples = [
      "What is the relationship between quantum computing and artificial intelligence?",
      "Explain how transformer neural networks work and their applications",
      "What are the main challenges in developing AGI?",
      "Compare and contrast supervised and unsupervised learning",
      "What are the ethical implications of large language models?",
    ];
    
    // Return a random example as the task
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    return randomExample;
  },
  
  // Solve a search query by searching across multiple knowledge sources
  solveTask: async (query, options = {}) => {
    try {
      // Import hooks dynamically to avoid hooks-outside-component issues
      const { useKnowledgeBase } = await import('@/hooks/useKnowledgeBase');
      const { useExternalKnowledge } = await import('@/hooks/useExternalKnowledge');
      const { queryKnowledgeBase } = useKnowledgeBase();
      const { searchWeb } = useExternalKnowledge();
      
      // Parse options properly
      const searchOptions = {
        useEmbeddings: true,
        matchThreshold: 0.5,
        includeNodes: true,
        includeWeb: false,
        limit: 10,
        ...(typeof options === 'object' ? options : {})
      };
      
      // Initialize results array
      let allResults: ExternalSource[] = [];
      
      // Search knowledge base (includes nodes if enabled)
      try {
        const kbResults = await queryKnowledgeBase({
          query,
          limit: searchOptions.limit,
          useEmbeddings: searchOptions.useEmbeddings,
          matchThreshold: searchOptions.matchThreshold,
          includeNodes: searchOptions.includeNodes
        });
        
        if (isArrayWithLength<ExternalSource>(kbResults)) {
          allResults = [...allResults, ...kbResults];
        }
      } catch (error) {
        console.error('Error searching knowledge base:', error);
        // Continue with other sources even if KB search fails
      }
      
      // Search web if enabled and we need more results
      if (searchOptions.includeWeb && 
          (searchOptions.forceWebSearch || allResults.length < searchOptions.limit)) {
        try {
          const webLimit = Math.max(1, searchOptions.limit - allResults.length);
          const webResults = await searchWeb(query, webLimit);
          
          if (isArrayWithLength<ExternalSource>(webResults)) {
            allResults = [...allResults, ...webResults];
          }
        } catch (error) {
          console.error('Error searching web:', error);
          // Continue with what we have
        }
      }
      
      // Sort combined results by source type priority
      allResults.sort((a, b) => {
        // Prioritize by source type: knowledge nodes > knowledge base > web
        const getSourcePriority = (source: ExternalSource) => {
          if (source.sourceType === 'node') return 3;
          if (source.sourceType === 'knowledge') return 2;
          return 1; // Web sources
        };
        
        return getSourcePriority(b) - getSourcePriority(a);
      });
      
      // Format the solution as a comprehensive answer with sources
      const sourcesText = allResults.slice(0, 5).map((source, index) => 
        `[${index + 1}] ${source.title} - ${source.snippet}`
      ).join('\n\n');
      
      const solution = `Search Results for: "${query}"\n\n${sourcesText}\n\n` +
        `Found ${allResults.length} results across all knowledge sources.`;
      
      return {
        solution,
        metadata: {
          resultCount: allResults.length,
          sources: allResults,
          query
        }
      };
    } catch (error) {
      console.error('Error in knowledge search engine:', error);
      return {
        solution: `Failed to search knowledge sources: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          error: true,
          query
        }
      };
    }
  },
  
  // Verify search results by checking if they match the query intent
  verifyTask: async (task, solution) => {
    // Simple verification - check if we have any results
    const metadata = solution?.metadata;
    
    if (!metadata || metadata.error) {
      return {
        result: false,
        explanation: 'Search failed due to an error',
        score: 0
      };
    }
    
    // Check if sources is an array and has items
    const hasSources = isArrayWithLength<ExternalSource>(metadata.sources);
    if (!hasSources) {
      return {
        result: false,
        explanation: 'No search results found for the query',
        score: 0
      };
    }
    
    // Calculate a basic relevance score based on number of results
    // First ensure we have a number for the result count
    let resultCount = 0;
    if (typeof metadata.resultCount === 'number') {
      resultCount = metadata.resultCount;
    } else if (isArrayWithLength<ExternalSource>(metadata.sources)) {
      resultCount = metadata.sources.length;
    }
    
    // Now we can safely perform arithmetic operations
    const normalizedScore = Math.min(1, resultCount / 10); // 10+ results = perfect score
    
    return {
      result: true,
      explanation: `Found ${resultCount} results for the query`,
      score: normalizedScore * 100 // Convert to percentage
    };
  },
  
  // Reflect on search results to extract insights
  reflectOnTask: async (task, solution, verification) => {
    const metadata = solution?.metadata || {};
    
    if (!verification?.result) {
      return {
        reflection: "The search yielded no results. Consider refining the query or expanding the knowledge sources.",
        insights: []
      };
    }
    
    const sources = Array.isArray(metadata.sources) ? metadata.sources : [];
    
    // Identify most common source types
    const sourceTypes = sources.reduce((acc, source) => {
      const type = source.sourceType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Generate insights based on the search results
    const insights = [
      `Query "${metadata.query}" returned ${sources.length} results`,
      `Source distribution: ${Object.entries(sourceTypes)
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ')}`,
    ];
    
    // Analyze the specific knowledge returned
    if (sources.length > 0) {
      // Extract key topics from titles
      const titles = sources.map(s => s.title).join(' ');
      const words = titles.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      const wordFreq = words.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Get top 5 keywords
      const topKeywords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
        
      if (topKeywords.length > 0) {
        insights.push(`Key topics: ${topKeywords.join(', ')}`);
      }
    }
    
    return {
      reflection: `Search for "${metadata.query}" found ${sources.length} results across multiple knowledge sources. The search returned a mix of ${Object.keys(sourceTypes).join(', ')} sources, suggesting ${sources.length > 5 ? 'broad coverage' : 'limited information'} on this topic in the knowledge base.`,
      insights
    };
  },
  
  // Generate a follow-up or refined search query
  mutateTask: async (task, solution, verification, reflection) => {
    // Safely access metadata and ensure it's an object
    const metadata = solution?.metadata || {};
    const query = metadata.query || task;
    
    // Add proper type checking for results
    const sources = Array.isArray(metadata.sources) ? metadata.sources : [];
    const hasNoResults = !verification?.result || sources.length === 0;
    
    if (hasNoResults) {
      // If no results, broaden the query
      const broadeningPrefixes = [
        "basics of ",
        "introduction to ",
        "overview of ",
        "fundamentals of ",
        "guide to "
      ];
      
      const randomPrefix = broadeningPrefixes[Math.floor(Math.random() * broadeningPrefixes.length)];
      return `${randomPrefix}${query}`;
    }
    
    // FIX: Convert the sources length to an explicit number to fix the arithmetic operation error
    const sourceCount = sources.length;
    
    // Now we can safely use sourceCount in numeric comparisons
    if (sourceCount > 10) {
      // If too many results, make the query more specific
      const specifyingPrefixes = [
        "detailed explanation of ",
        "technical breakdown of ",
        "advanced concepts in ",
        "practical applications of ",
      ];
      
      const prefix = specifyingPrefixes[Math.floor(Math.random() * specifyingPrefixes.length)];
      return prefix + query;
    }
    
    // Otherwise, generate a follow-up query based on the original
    const followUpPatterns = [
      `Compare ${query} with related approaches`,
      `Latest developments in ${query}`,
      `Practical applications of ${query}`,
      `Challenges and limitations of ${query}`,
      `Future directions for ${query}`,
    ];
    
    return followUpPatterns[Math.floor(Math.random() * followUpPatterns.length)];
  }
};
