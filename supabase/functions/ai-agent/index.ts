
import { corsHeaders } from './_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { OpenAI } from "https://deno.land/x/openai@v1.0.0/mod.ts";
import { analyzeComplexity } from './complexity-analysis.ts';
import { executeLearningLoop } from './learning-loop.ts';
import { persistInsightAsKnowledgeNode } from './knowledge-persistence.ts';

// Set up Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

// Set up OpenAI client
const openAIKey = Deno.env.get('OPENAI_API_KEY');

if (!openAIKey) {
  console.error('Missing OPENAI_API_KEY environment variable.');
  Deno.exit(1);
}

const openai = new OpenAI(openAIKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, userId } = await req.json();

    // Check for missing data
    if (!message || !conversationHistory || !userId) {
      return new Response(JSON.stringify({ error: 'Missing message, conversationHistory, or userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authenticate user (optional, but recommended)
    const { data: authData, error: authError } = await supabase.auth.getUser(req.headers.get('Authorization')?.split(' ')[1] || '');

    if (authError || !authData?.user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the original message
    const originalMessage = message;

    // Analyze complexity
    const complexityDecision = await analyzeComplexity(originalMessage, conversationHistory, openai, supabase);

    // Learning loop execution
    const { finalResponse, accumulatedContext, toolsUsed } = await executeLearningLoop(
      originalMessage,
      conversationHistory,
      complexityDecision,
      openai,
      supabase
    );

    // After the learning loop completes, update the persistence section:
    
    // Learning persistence with proper nodeId capture
    let learningInsights = [];
    if (complexityDecision.classification === 'COMPLEX') {
      console.log('🧠 Attempting to persist learning insights...');
      
      try {
        const persistenceResult = await persistInsightAsKnowledgeNode(
          originalMessage,
          finalResponse,
          accumulatedContext,
          userId,
          complexityDecision,
          supabase
        );

        if (persistenceResult && persistenceResult.nodeId) {
          console.log('✅ Learning insights persisted successfully with nodeId:', persistenceResult.nodeId);
          learningInsights.push({
            name: 'learning_generation',
            success: true,
            result: {
              nodeId: persistenceResult.nodeId,
              insights: 'Generated learning insights from complex query',
              complexity: complexityDecision.classification,
              iterations: accumulatedContext.length,
              persistenceStatus: 'persisted'
            }
          });
        } else {
          console.log('❌ Learning insights persistence failed or skipped');
          learningInsights.push({
            name: 'learning_generation',
            success: false,
            result: {
              nodeId: 'failed',
              insights: 'Failed to generate significant insights',
              complexity: complexityDecision.classification,
              iterations: accumulatedContext.length,
              persistenceStatus: 'failed'
            }
          });
        }
      } catch (error) {
        console.error('Error in learning persistence:', error);
        learningInsights.push({
          name: 'learning_generation',
          success: false,
          result: {
            nodeId: 'error',
            insights: `Error: ${error.message}`,
            complexity: complexityDecision.classification,
            iterations: accumulatedContext.length,
            persistenceStatus: 'failed'
          }
        });
      }
    }

    // Construct the response
    const responseData = {
      response: finalResponse,
      toolsUsed: toolsUsed,
      learningInsights: learningInsights
    };

    return new Response(
      JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
