
import { extractAssistantMessage } from './response-handler.ts';

/**
 * Reflection function to evaluate response completeness and decide next actions
 */
export async function reflectAndDecide(
  originalQuery: string,
  response: string,
  toolsUsed: any[],
  modelSettings: any,
  supabase: any
): Promise<{
  continue: boolean;
  nextAction?: string;
  reasoning?: string;
}> {
  console.log('🤔 Starting reflection on response completeness');

  try {
    const reflectionPrompt = `You are evaluating whether you fully answered a user's question and should continue working.

**Original Question:** "${originalQuery}"

**Your Response:** "${response}"

**Tools Used:** ${toolsUsed.length > 0 ? toolsUsed.map(t => t.name).join(', ') : 'None'}

**Evaluation Criteria:**
1. Did you completely answer the user's question?
2. Is there valuable follow-up information you could provide?
3. Should you proactively offer related help?
4. Are there gaps that need addressing?

**Instructions:**
- If the response is complete and satisfactory, return { "continue": false }
- If you should do more work, return { "continue": true, "nextAction": "specific action to take", "reasoning": "why you need to continue" }
- Be selective - only continue if it adds clear value
- Keep nextAction concise and actionable

Respond with valid JSON only:`;

    const reflectionMessages = [
      {
        role: 'system',
        content: reflectionPrompt
      },
      {
        role: 'user',
        content: `Please evaluate this interaction and decide if you should continue working.`
      }
    ];

    const reflectionResponse = await supabase.functions.invoke('ai-model-proxy', {
      body: {
        messages: reflectionMessages,
        temperature: 0.3,
        max_tokens: 300,
        ...(modelSettings && {
          provider: modelSettings.provider,
          model: modelSettings.selectedModel,
          localModelUrl: modelSettings.localModelUrl
        })
      }
    });

    if (reflectionResponse.error) {
      console.error('Reflection call failed:', reflectionResponse.error);
      return { continue: false };
    }

    const reflectionText = extractAssistantMessage(reflectionResponse.data);
    console.log('🧠 Reflection result:', reflectionText);

    // Parse JSON response
    try {
      const decision = JSON.parse(reflectionText || '{"continue": false}');
      
      return {
        continue: decision.continue || false,
        nextAction: decision.nextAction,
        reasoning: decision.reasoning
      };
    } catch (parseError) {
      console.error('Failed to parse reflection JSON:', parseError);
      return { continue: false };
    }

  } catch (error) {
    console.error('Error in reflection:', error);
    return { continue: false };
  }
}

/**
 * Submit autonomous follow-up message
 */
export async function submitFollowUpMessage(
  nextAction: string,
  userId: string | null,
  sessionId: string | null,
  parentMessageId: string,
  reasoning: string,
  supabase: any
): Promise<string | null> {
  if (!userId || !sessionId) {
    console.log('No user/session for follow-up message');
    return null;
  }

  try {
    console.log('🔄 Submitting autonomous follow-up message:', nextAction);

    // Insert the reflection message
    const { data: messageData, error: messageError } = await supabase
      .from('agent_conversations')
      .insert({
        user_id: userId,
        session_id: sessionId,
        role: 'assistant',
        content: nextAction,
        message_type: 'reflection',
        ai_reasoning: reasoning,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (messageError) {
      console.error('Failed to insert follow-up message:', messageError);
      return null;
    }

    // Log the reflection decision
    await supabase
      .from('agent_reflections')
      .insert({
        parent_message_id: parentMessageId,
        follow_up_message_id: messageData.id,
        reflection_reasoning: reasoning,
        follow_up_decision: true,
        next_action: nextAction,
        created_at: new Date().toISOString()
      })
      .catch((error: any) => {
        console.warn('Failed to log reflection (table may not exist):', error);
      });

    return messageData.id;

  } catch (error) {
    console.error('Error submitting follow-up message:', error);
    return null;
  }
}
