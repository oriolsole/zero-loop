
// Domain engines - registry of all domain engines

import { DomainEngine } from '../types/intelligence';

// Import engines and their metadata
import { logicalReasoningEngine, logicalReasoningEngineMetadata } from './logicalReasoning';
import { regexPatternsEngine, regexPatternsEngineMetadata } from './regexPatterns';
import { webKnowledgeEngine, webKnowledgeEngineMetadata } from './webKnowledgeEngine';
import { aiReasoningEngine, aiReasoningEngineMetadata } from './aiReasoningEngine';
import { mathEngine, mathEngineMetadata } from './mathEngine';
import { writingEngine, writingEngineMetadata } from './writingEngine';
import { businessEngine, businessEngineMetadata } from './businessEngine';
import { webScrapingEngine, webScrapingEngineMetadata } from './webScrapingEngine';

// Registry of all available domain engines
export const domainEngines: Record<string, DomainEngine> = {
  'logic': logicalReasoningEngine,
  'programming': regexPatternsEngine,
  'web-knowledge': webKnowledgeEngine,
  'ai-reasoning': aiReasoningEngine,
  'math': mathEngine,
  'writing': writingEngine,
  'business': businessEngine,
  'web-scraping': webScrapingEngine
};

// Export engine metadata for UI components
export const engineMetadata = {
  'logic': logicalReasoningEngineMetadata,
  'programming': regexPatternsEngineMetadata,
  'web-knowledge': webKnowledgeEngineMetadata,
  'ai-reasoning': aiReasoningEngineMetadata,
  'math': mathEngineMetadata,
  'writing': writingEngineMetadata,
  'business': businessEngineMetadata,
  'web-scraping': webScrapingEngineMetadata
};
