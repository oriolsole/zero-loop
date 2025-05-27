
/**
 * Learning Loop Execution Module
 * Handles iterative processing and tool usage
 */

export async function executeLearningLoop(
  originalMessage: string,
  conversationHistory: any[],
  complexityDecision: any,
  openai: any,
  supabase: any
): Promise<{ 
  finalResponse: string; 
  accumulatedContext: any[]; 
  toolsUsed: any[] 
}> {
  try {
    const accumulatedContext = [];
    const toolsUsed = [];

    // For simple queries, provide direct response
    if (complexityDecision.classification === 'SIMPLE') {
      console.log('📝 Processing simple query');
      
      const response = await generateSimpleResponse(
        originalMessage,
        conversationHistory,
        openai
      );

      return {
        finalResponse: response,
        accumulatedContext: [{
          iteration: 1,
          response: response,
          toolsUsed: []
        }],
        toolsUsed: []
      };
    }

    // For complex queries, implement iterative processing
    console.log('🔄 Processing complex query with iterations');
    let currentResponse = '';
    let iteration = 1;
    const maxIterations = 2; // Reduced to prevent timeouts

    while (iteration <= maxIterations) {
      const iterationResult = await processIteration(
        originalMessage,
        conversationHistory,
        currentResponse,
        iteration,
        openai,
        supabase
      );

      accumulatedContext.push({
        iteration,
        response: iterationResult.response,
        toolsUsed: iterationResult.toolsUsed
      });

      toolsUsed.push(...iterationResult.toolsUsed);
      currentResponse = iterationResult.response;

      // Check if we should continue iterating
      if (iterationResult.shouldStop || iteration >= maxIterations) {
        break;
      }

      iteration++;
    }

    return {
      finalResponse: currentResponse,
      accumulatedContext,
      toolsUsed
    };
  } catch (error) {
    console.error('Error in learning loop execution:', error);
    return {
      finalResponse: 'I encountered an error while processing your request. Please try again.',
      accumulatedContext: [],
      toolsUsed: []
    };
  }
}

async function generateSimpleResponse(
  message: string,
  conversationHistory: any[],
  openai: any
): Promise<string> {
  try {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Provide clear, concise responses to user queries. If the user is asking about Jira projects or similar tools, let them know that you can help with that through the integrated tools.'
      },
      ...conversationHistory.slice(-5), // Include last 5 messages for context
      {
        role: 'user',
        content: message
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
  } catch (error) {
    console.error('Error generating simple response:', error);
    return 'I encountered an error while generating a response. Please try again.';
  }
}

async function processIteration(
  originalMessage: string,
  conversationHistory: any[],
  currentResponse: string,
  iteration: number,
  openai: any,
  supabase: any
): Promise<{
  response: string;
  toolsUsed: any[];
  shouldStop: boolean;
}> {
  try {
    const messages = [
      {
        role: 'system',
        content: `You are processing iteration ${iteration} of a complex query. Build upon previous responses and provide additional insights.`
      },
      {
        role: 'user',
        content: originalMessage
      }
    ];

    if (currentResponse) {
      messages.push({
        role: 'assistant',
        content: `Previous response: ${currentResponse}`
      });
      messages.push({
        role: 'user',
        content: 'Please elaborate or provide additional information.'
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 600,
      temperature: 0.7
    });

    const generatedResponse = response.choices[0]?.message?.content || '';
    
    return {
      response: generatedResponse,
      toolsUsed: [], // No tools used in this simple implementation
      shouldStop: iteration >= 1 // Stop after 1 iteration for now to prevent timeouts
    };
  } catch (error) {
    console.error('Error in iteration processing:', error);
    return {
      response: 'Error occurred during processing.',
      toolsUsed: [],
      shouldStop: true
    };
  }
}
