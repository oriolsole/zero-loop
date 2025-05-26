
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
  complexityAnalysis: any,
  supabase: any
): Promise<boolean> {
  try {
    console.log('Persisting insights as knowledge node...');

    // Generate insight summary
    const insight = await generateInsightSummary(
      originalMessage,
      finalResponse,
      accumulatedContext,
      complexityAnalysis,
      supabase
    );

    if (!insight) {
      console.log('No significant insight generated, skipping persistence');
      return false;
    }

    // Check if similar knowledge already exists
    const existingSimilar = await checkForSimilarKnowledge(insight.title, userId, supabase);
    if (existingSimilar) {
      console.log('Similar knowledge already exists, skipping persistence');
      return false;
    }

    // Create knowledge node
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
          complexity: complexityAnalysis.complexity,
          iterations_used: accumulatedContext.length,
          tools_involved: insight.toolsInvolved,
          created_by: 'unified-ai-agent',
          tags: insight.tags || []
        }
      });

    if (nodeError) {
      console.error('Error creating knowledge node:', nodeError);
      return false;
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

    return true;
  } catch (error) {
    console.error('Error persisting insight as knowledge node:', error);
    return false;
  }
}

/**
 * Generate insight summary from learning loop results
 */
async function generateInsightSummary(
  originalMessage: string,
  finalResponse: string,
  accumulatedContext: any[],
  complexityAnalysis: any,
  supabase: any
): Promise<any | null> {
  try {
    const contextSummary = accumulatedContext.map(ctx => 
      `Iteration ${ctx.iteration}: ${ctx.response}\nTools: ${ctx.toolsUsed?.map(t => t.name).join(', ') || 'none'}`
    ).join('\n\n');

    const toolsInvolved = Array.from(new Set(
      accumulatedContext.flatMap(ctx => ctx.toolsUsed?.map(t => t.name) || [])
    ));

    const insightMessages = [
      {
        role: 'system',
        content: `Generate a structured insight summary for a knowledge base. Extract the key learnings, patterns, and reusable knowledge from this research session.

        Respond with JSON in this format:
        {
          "title": "Concise, searchable title (max 100 chars)",
          "description": "Detailed description of the insight (max 500 chars)",
          "type": "insight|concept|process|fact|strategy",
          "confidence": 0.0-1.0,
          "domain": "relevant domain or category",
          "tags": ["tag1", "tag2", "tag3"],
          "isSignificant": true/false,
          "reasoning": "Why this insight is valuable for future reference"
        }

        Only mark as significant if it contains reusable knowledge, patterns, or insights that would be valuable for future queries.`
      },
      {
        role: 'user',
        content: `Original query: "${originalMessage}"

        Research process:
        ${contextSummary}

        Final answer: "${finalResponse}"

        Tools used: ${toolsInvolved.join(', ')}
        Query complexity: ${complexityAnalysis.complexity}

        Extract the key insight for the knowledge base.`
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
      return null;
    }

    try {
      const insight = JSON.parse(insightMessage);
      
      // Only persist significant insights
      if (!insight.isSignificant) {
        return null;
      }

      // Add tools involved
      insight.toolsInvolved = toolsInvolved;
      
      return insight;
    } catch (parseError) {
      console.error('Error parsing insight JSON:', parseError);
      return null;
    }

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
          tools_used: insight.toolsInvolved
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
