/**
 * Knowledge Persistence for Learning Loop Integration
 */

/**
 * Persist insights as knowledge nodes from learning loop iterations
 */
export async function persistInsightAsKnowledgeNode(
  originalMessage: string,
  finalResponse: string,
  accumulatedContext: any[],
  userId: string,
  complexityDecision: any,
  supabase: any
): Promise<any> {
  try {
    console.log('Persisting insights as knowledge node...');

    // Check tool execution success before proceeding with learning
    const toolExecutionResults = accumulatedContext.flatMap(ctx => ctx.toolsUsed || []);
    const hasValidToolResults = validateToolExecutionForLearning(toolExecutionResults);
    
    if (!hasValidToolResults.shouldLearn) {
      console.log('Skipping knowledge persistence:', hasValidToolResults.reason);
      return {
        success: false,
        insights: hasValidToolResults.reason,
        nodeId: null,
        skipped: true,
        reason: hasValidToolResults.reason
      };
    }

    // Generate insight summary with tool execution context
    const insight = await generateInsightSummary(
      originalMessage,
      finalResponse,
      accumulatedContext,
      complexityDecision,
      supabase,
      hasValidToolResults
    );

    if (!insight) {
      console.log('No significant insight generated, skipping persistence');
      return {
        success: false,
        insights: 'No significant insights generated',
        nodeId: null
      };
    }

    // Check if similar knowledge already exists
    const existingSimilar = await checkForSimilarKnowledge(insight.title, userId, supabase);
    if (existingSimilar) {
      console.log('Similar knowledge already exists, skipping persistence');
      return {
        success: false,
        insights: insight,
        nodeId: null,
        reason: 'Similar knowledge already exists'
      };
    }

    // Create knowledge node with enhanced metadata
    const nodeId = crypto.randomUUID();
    const { error: nodeError } = await supabase
      .from('knowledge_nodes')
      .insert({
        id: nodeId,
        title: insight.title,
        description: insight.description,
        type: insight.type,
        domain_id: insight.domain || 'ai-agent',
        discovered_in_loop: 0, // AI agent discoveries
        confidence: insight.confidence,
        user_id: userId,
        metadata: {
          source: 'ai-agent-learning-loop',
          original_query: originalMessage,
          ai_classification: complexityDecision.classification,
          ai_reasoning: complexityDecision.reasoning,
          iterations_used: accumulatedContext.length,
          tools_involved: insight.toolsInvolved,
          created_by: 'unified-ai-agent',
          tags: insight.tags || [],
          // Enhanced metadata for tool execution context
          tool_execution_context: hasValidToolResults.context,
          learning_confidence: hasValidToolResults.confidence,
          knowledge_quality: hasValidToolResults.quality,
          is_tentative: hasValidToolResults.tentative || false,
          validation_status: 'unverified'
        }
      });

    if (nodeError) {
      console.error('Error creating knowledge node:', nodeError);
      return {
        success: false,
        insights: insight,
        nodeId: null,
        error: nodeError.message
      };
    }

    console.log('Successfully persisted knowledge node:', nodeId);

    // Create knowledge chunk for searchability
    await createSearchableKnowledgeChunk(
      insight,
      originalMessage,
      finalResponse,
      userId,
      supabase
    );

    return {
      success: true,
      insights: insight,
      nodeId: nodeId,
      toolsInvolved: insight.toolsInvolved,
      confidence: hasValidToolResults.confidence,
      quality: hasValidToolResults.quality
    };
  } catch (error) {
    console.error('Error persisting insight as knowledge node:', error);
    return {
      success: false,
      insights: 'Error generating insights',
      nodeId: null,
      error: error.message
    };
  }
}

/**
 * Validate tool execution results to determine if learning should proceed
 */
function validateToolExecutionForLearning(toolResults: any[]): {
  shouldLearn: boolean;
  reason?: string;
  confidence: number;
  quality: 'high' | 'medium' | 'low' | 'tentative';
  tentative: boolean;
  context: any;
} {
  if (!toolResults || toolResults.length === 0) {
    return {
      shouldLearn: true,
      confidence: 0.8,
      quality: 'medium',
      tentative: false,
      context: { type: 'no_tools_used', tool_count: 0 }
    };
  }

  const failedTools = toolResults.filter(tool => !tool.success);
  const successfulTools = toolResults.filter(tool => tool.success);
  
  // If all tools failed, don't learn
  if (failedTools.length === toolResults.length) {
    return {
      shouldLearn: false,
      reason: 'All tool executions failed - preventing false negative learning',
      confidence: 0.0,
      quality: 'low',
      tentative: true,
      context: {
        type: 'all_tools_failed',
        tool_count: toolResults.length,
        failed_tools: failedTools.map(t => t.name)
      }
    };
  }

  // Check for empty results that might indicate false negatives
  const emptyResults = successfulTools.filter(tool => {
    const result = tool.result;
    if (!result) return true;
    
    // Check for common empty result patterns
    if (typeof result === 'object') {
      if (result.total === 0) return true;
      if (result.issues && result.issues.length === 0) return true;
      if (result.results && result.results.length === 0) return true;
      if (Array.isArray(result) && result.length === 0) return true;
    }
    
    return false;
  });

  // If majority of successful tools returned empty results, mark as tentative
  if (emptyResults.length > successfulTools.length / 2) {
    return {
      shouldLearn: true,
      confidence: 0.4,
      quality: 'tentative',
      tentative: true,
      context: {
        type: 'empty_results_majority',
        tool_count: toolResults.length,
        successful_tools: successfulTools.length,
        empty_results: emptyResults.length,
        tools_with_empty_results: emptyResults.map(t => t.name)
      }
    };
  }

  // If some tools failed but others succeeded with data, proceed with medium confidence
  if (failedTools.length > 0) {
    return {
      shouldLearn: true,
      confidence: 0.6,
      quality: 'medium',
      tentative: false,
      context: {
        type: 'mixed_results',
        tool_count: toolResults.length,
        successful_tools: successfulTools.length,
        failed_tools: failedTools.length
      }
    };
  }

  // All tools succeeded with data
  return {
    shouldLearn: true,
    confidence: 0.9,
    quality: 'high',
    tentative: false,
    context: {
      type: 'all_tools_successful',
      tool_count: toolResults.length,
      successful_tools: successfulTools.length
    }
  };
}

/**
 * Extract JSON from various response formats
 */
function extractJSONFromResponse(content: string): any | null {
  if (!content) return null;

  // Strategy 1: Try direct JSON parsing
  try {
    return JSON.parse(content);
  } catch (e) {
    // Continue to other strategies
  }

  // Strategy 2: Extract from markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;
  const codeBlockMatch = content.match(codeBlockRegex);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch (e) {
      console.log('Failed to parse JSON from code block:', e.message);
    }
  }

  // Strategy 3: Find JSON-like content between curly braces
  const jsonRegex = /\{[\s\S]*\}/;
  const jsonMatch = content.match(jsonRegex);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log('Failed to parse JSON from regex match:', e.message);
    }
  }

  // Strategy 4: Try to clean up common formatting issues
  try {
    const cleaned = content
      .replace(/^\s*```(?:json)?\s*/i, '') // Remove starting markdown
      .replace(/\s*```\s*$/, '') // Remove ending markdown
      .replace(/^[^{]*(\{)/, '$1') // Remove text before first {
      .replace(/(\})[^}]*$/, '$1') // Remove text after last }
      .trim();
    
    return JSON.parse(cleaned);
  } catch (e) {
    console.log('Failed to parse cleaned JSON:', e.message);
  }

  return null;
}

/**
 * Validate insight object has required fields
 */
function validateInsight(insight: any): boolean {
  if (!insight || typeof insight !== 'object') {
    return false;
  }

  const requiredFields = ['title', 'description', 'type', 'isSignificant'];
  const hasAllRequired = requiredFields.every(field => 
    insight.hasOwnProperty(field) && insight[field] !== undefined && insight[field] !== null
  );

  if (!hasAllRequired) {
    console.log('Insight missing required fields:', requiredFields.filter(field => !insight.hasOwnProperty(field)));
    return false;
  }

  // Check if marked as significant
  if (!insight.isSignificant) {
    console.log('Insight not marked as significant');
    return false;
  }

  return true;
}

/**
 * Generate insight summary from learning loop results with tool execution context
 */
async function generateInsightSummary(
  originalMessage: string,
  finalResponse: string,
  accumulatedContext: any[],
  complexityAnalysis: any,
  supabase: any,
  toolContext: any
): Promise<any | null> {
  try {
    const contextSummary = accumulatedContext.map(ctx => 
      `Iteration ${ctx.iteration}: ${ctx.response}\nTools: ${ctx.toolsUsed?.map(t => t.name).join(', ') || 'none'}`
    ).join('\n\n');

    const toolsInvolved = Array.from(new Set(
      accumulatedContext.flatMap(ctx => ctx.toolsUsed?.map(t => t.name) || [])
    ));

    // Enhanced system prompt with tool execution awareness
    const insightMessages = [
      {
        role: 'system',
        content: `Generate a structured insight summary for a knowledge base. Extract the key learnings, patterns, and reusable knowledge from this research session.

        IMPORTANT: Be aware of tool execution context:
        - Tool Quality: ${toolContext.quality}
        - Confidence: ${toolContext.confidence}
        - Tentative: ${toolContext.tentative}
        - Context: ${JSON.stringify(toolContext.context)}

        If tools failed or returned empty results, DO NOT create insights that state definitive facts about data absence.
        Instead, focus on process insights, methodology learnings, or clearly mark data-related insights as tentative.

        Respond with ONLY a JSON object in this exact format:
        {
          "title": "Concise, searchable title (max 100 chars)",
          "description": "Detailed description of the insight (max 500 chars)",
          "type": "insight|concept|process|fact|strategy|tentative_fact",
          "confidence": 0.0-1.0,
          "domain": "relevant domain or category",
          "tags": ["tag1", "tag2", "tag3"],
          "isSignificant": true/false,
          "reasoning": "Why this insight is valuable for future reference",
          "data_quality": "${toolContext.quality}",
          "is_tentative": ${toolContext.tentative}
        }

        For tentative insights or those based on tool failures/empty results:
        - Use type "tentative_fact" for data-related insights
        - Lower the confidence score
        - Include disclaimers in description
        - Add "tentative", "unverified", or "tool_limited" tags

        Only mark as significant if it contains reusable knowledge, patterns, or insights that would be valuable for future queries.
        Do NOT wrap the JSON in markdown code blocks or add any other text.`
      },
      {
        role: 'user',
        content: `Original query: "${originalMessage}"

        Research process:
        ${contextSummary}

        Final answer: "${finalResponse}"

        Tools used: ${toolsInvolved.join(', ')}
        Query complexity: ${complexityAnalysis.complexity}
        Tool execution quality: ${toolContext.quality}

        Extract the key insight for the knowledge base, being mindful of tool execution context.`
      }
    ];

    const response = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: insightMessages,
        temperature: 0.3,
        max_tokens: 400
      }
    });

    if (response.error) {
      console.error('Error generating insight summary:', response.error);
      return null;
    }

    const insightMessage = response.data?.choices?.[0]?.message?.content;
    if (!insightMessage) {
      console.log('No insight message received from AI');
      return null;
    }

    console.log('Raw insight response:', insightMessage);

    // Use robust JSON extraction
    const insight = extractJSONFromResponse(insightMessage);
    
    if (!insight) {
      console.error('Failed to extract valid JSON from insight response');
      return null;
    }

    // Validate the insight object
    if (!validateInsight(insight)) {
      console.log('Insight validation failed');
      return null;
    }

    console.log('Successfully parsed and validated insight:', insight.title);

    // Add tools involved and context
    insight.toolsInvolved = toolsInvolved;
    insight.toolExecutionContext = toolContext;
    
    return insight;

  } catch (error) {
    console.error('Error in generateInsightSummary:', error);
    return null;
  }
}

/**
 * Check for similar existing knowledge to avoid duplicates
 */
async function checkForSimilarKnowledge(
  title: string,
  userId: string,
  supabase: any
): Promise<boolean> {
  try {
    const { data: existingNodes, error } = await supabase
      .from('knowledge_nodes')
      .select('title, description')
      .eq('user_id', userId)
      .ilike('title', `%${title.split(' ').slice(0, 3).join('%')}%`)
      .limit(5);

    if (error) {
      console.error('Error checking for similar knowledge:', error);
      return false;
    }

    // Simple similarity check based on title overlap
    const titleWords = title.toLowerCase().split(' ');
    const hasMatch = existingNodes?.some(node => {
      const nodeWords = node.title.toLowerCase().split(' ');
      const overlap = titleWords.filter(word => nodeWords.includes(word)).length;
      return overlap >= Math.min(titleWords.length * 0.6, 3);
    });

    return hasMatch || false;
  } catch (error) {
    console.error('Error in checkForSimilarKnowledge:', error);
    return false;
  }
}

/**
 * Create searchable knowledge chunk for retrieval
 */
async function createSearchableKnowledgeChunk(
  insight: any,
  originalMessage: string,
  finalResponse: string,
  userId: string,
  supabase: any
): Promise<void> {
  try {
    const chunkContent = `${insight.title}\n\n${insight.description}\n\nOriginal Query: ${originalMessage}\n\nKey Insights: ${finalResponse}`;

    const { error } = await supabase
      .from('knowledge_chunks')
      .insert({
        title: insight.title,
        content: chunkContent,
        user_id: userId,
        metadata: {
          source: 'ai-agent-learning-loop',
          type: insight.type,
          confidence: insight.confidence,
          domain: insight.domain,
          tags: insight.tags,
          tools_used: insight.toolsInvolved,
          data_quality: insight.data_quality,
          is_tentative: insight.is_tentative
        }
      });

    if (error) {
      console.error('Error creating knowledge chunk:', error);
    } else {
      console.log('Created searchable knowledge chunk for insight');
    }
  } catch (error) {
    console.error('Error in createSearchableKnowledgeChunk:', error);
  }
}

/**
 * Deprecate or correct existing knowledge nodes
 */
export async function deprecateKnowledgeNode(
  nodeId: string,
  reason: string,
  userId: string,
  supabase: any
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('knowledge_nodes')
      .update({
        metadata: supabase.rpc('jsonb_set', {
          target: 'metadata',
          path: ['validation_status'],
          new_value: '"deprecated"'
        }),
        updated_at: new Date().toISOString()
      })
      .eq('id', nodeId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deprecating knowledge node:', error);
      return false;
    }

    console.log('Successfully deprecated knowledge node:', nodeId, 'Reason:', reason);
    return true;
  } catch (error) {
    console.error('Error in deprecateKnowledgeNode:', error);
    return false;
  }
}
