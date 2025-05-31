
/**
 * Main response handler - orchestrates response extraction and synthesis
 */

import { extractAssistantMessage } from './response-extractor.ts';
import { synthesizeFinalResponse } from './synthesis-orchestrator.ts';

// Re-export main functions for backward compatibility
export { extractAssistantMessage, synthesizeFinalResponse };
