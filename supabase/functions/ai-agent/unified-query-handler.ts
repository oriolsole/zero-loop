import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.5";

import { handleUnifiedQuery } from './unified-query-handler.ts';
import { detectOrchestrationNeeds } from './orchestration-detector.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Enhanced content validation with guaranteed non-null response
 */
function validateAndEnsureContent(content: any, context: string = 'Unknown'): string {
  console.log(`[CONTENT_VALIDATION] Validating content for ${context}:`, {
    contentType: typeof content,
    contentLength: content?.length || 0,
    isNull: content === null,
    isUndefined: content === undefined,
    isEmpty: !content || content.trim?.() === ''
  });

  if (!content) {
    const fallbackMessage = `I apologize, but I encountered an issue generating a response for your request (${context}). Please try again or rephrase your question.`;
    console.error(`[CONTENT_VALIDATION] Content validation failed for ${context}: content is null/undefined, using fallback`);
    return fallbackMessage;
  }

  if (typeof content !== 'string') {
    console.warn(`[CONTENT_VALIDATION] Content validation warning for ${context}: content is not a string, converting`);
    const stringContent = String(content);
    if (!stringContent.trim()) {
      const fallbackMessage = `I processed your request but encountered an issue formatting the response (${context}). Please try again.`;
      console.error(`[CONTENT_VALIDATION] Converted content is empty for ${context}, using fallback`);
      return fallbackMessage;
    }
    return stringContent;
  }

  if (!content.trim()) {
    const fallbackMessage = `I received your request but generated an empty response (${context}). Please try rephrasing your question.`;
    console.error(`[CONTENT_VALIDATION] Content validation failed for ${context}: content is empty string, using fallback`);
    return fallbackMessage;
  }

  console.log(`[CONTENT_VALIDATION] Content validation successful for ${context}: ${content.length} characters`);
  return content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      conversationHistory = [], 
      userId, 
      sessionId, 
      streaming = false, 
      modelSettings, 
      testMode = false, 
      loopEnabled = false,
      agentId, // Agent ID parameter for tool configuration
      customSystemPrompt // Custom system prompt parameter
    } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('🤖 AI Agent unified request:', { 
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''), 
      historyLength: conversationHistory.length, 
      userId, 
      sessionId,
      streaming,
      modelSettings,
      testMode,
      loopEnabled,
      agentId, // Log the agent ID
      hasCustomPrompt: !!customSystemPrompt
    });

    // CRITICAL FIX: Do NOT store user message in database here
    // The frontend already handles user message insertion to prevent duplicates
    console.log('🚫 Skipping user message insertion - handled by frontend to prevent duplicates');

    // In test mode, return basic response for validation
    if (testMode) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Test mode: Unified handler would process query "${message}" with agent ${agentId || 'default'}`,
          unifiedApproach: true,
          testMode: true,
          agentId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎯 [UNIFIED] Starting unified query handler with orchestration detection');
  
  // Detect if we should use orchestration
  const orchestrationContext = detectOrchestrationNeeds(message);
  console.log('🎼 [ORCHESTRATION] Detection result:', orchestrationContext);

  // If orchestration is needed, return orchestration plan instead of executing directly
  if (orchestrationContext.shouldUseOrchestration && orchestrationContext.suggestedTools.length > 1) {
    console.log('🚀 [ORCHESTRATION] Creating multi-tool plan');
    
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const executions = orchestrationContext.suggestedTools.map((tool, index) => ({
      id: `${planId}-exec-${index + 1}`,
      tool: `execute_${tool}`,
      description: getToolDescription(tool, message),
      status: 'pending' as const,
      parameters: getToolParameters(tool, message),
      dependencies: [],
      canRunInParallel: true,
      priority: index,
      estimatedDuration: getEstimatedDuration(tool)
    }));

    const totalEstimatedTime = executions.reduce((sum, exec) => sum + exec.estimatedDuration, 0);

    return {
      success: true,
      message: `I'll execute a coordinated plan using ${orchestrationContext.suggestedTools.length} tools to comprehensively address your request.`,
      orchestrationPlan: {
        id: planId,
        title: `Multi-Tool Analysis: ${orchestrationContext.suggestedTools.length} tools`,
        description: `Coordinated execution of ${orchestrationContext.suggestedTools.join(', ')} for comprehensive results`,
        executions,
        executionGroups: [executions], // Simple grouping for now
        status: 'pending',
        currentExecutionIndex: 0,
        currentGroupIndex: 0,
        totalEstimatedTime,
        optimizationApplied: false
      },
      requiresOrchestration: true,
      toolsUsed: [],
      availableToolsCount: orchestrationContext.suggestedTools.length
    };
  }

    // Use unified query handler for all requests with agent ID
    const result = await handleUnifiedQuery(
      message,
      conversationHistory,
      userId,
      sessionId,
      modelSettings,
      streaming,
      supabase,
      0, // loopIteration
      loopEnabled, // Pass the loop setting
      customSystemPrompt, // Pass the custom system prompt
      agentId // Pass the agent ID for tool configuration
    );

    // Handle streaming responses
    if (result.streaming) {
      return new Response(JSON.stringify(result.data), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    console.log('✅ Unified query completed successfully for agent:', agentId);
    console.log('📏 Response length:', result.message?.length || 0);
    console.log('🛠️ Tools available:', result.availableToolsCount || 0);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ AI Agent error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
        details: 'Check the edge function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function getToolDescription(tool: string, query: string): string {
  const descriptions = {
    'web-search': `Search the web for: ${query}`,
    'web-scraper': 'Extract detailed content from search results',
    'knowledge-search-v2': 'Search knowledge base for relevant information',
    'github-tools': 'Analyze GitHub repository',
    'jira-tools': 'Access Jira project information',
    'gmail-tools': 'Access Gmail data'
  };
  
  return descriptions[tool as keyof typeof descriptions] || `Execute ${tool}`;
}

function getToolParameters(tool: string, query: string): Record<string, any> {
  const parameters = {
    'web-search': { query },
    'web-scraper': { url: '', extract_content: true },
    'knowledge-search-v2': { query, limit: 5 },
    'github-tools': { action: 'get_repository' },
    'jira-tools': { action: 'list_projects' },
    'gmail-tools': { action: 'list_emails', maxResults: 5 }
  };
  
  return parameters[tool as keyof typeof parameters] || { query };
}

function getEstimatedDuration(tool: string): number {
  const durations = {
    'web-search': 4,
    'web-scraper': 8,
    'knowledge-search-v2': 3,
    'github-tools': 5,
    'jira-tools': 4,
    'gmail-tools': 3
  };
  
  return durations[tool as keyof typeof durations] || 5;
}
