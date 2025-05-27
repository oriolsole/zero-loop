
import { corsHeaders } from './_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { analyzeComplexity } from './complexity-analysis.ts';
import { executeLearningLoop } from './learning-loop.ts';
import { persistInsightAsKnowledgeNode } from './knowledge-persistence.ts';

// Set up Supabase client with service role for admin operations
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  Deno.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

// Set up regular Supabase client for user operations
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
if (!supabaseAnonKey) {
  console.error('Missing SUPABASE_ANON_KEY environment variable.');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

const openai = new OpenAI({
  apiKey: openAIKey,
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, userId, modelSettings } = await req.json();

    // Check for missing data
    if (!message || !userId) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing message or userId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the original message
    const originalMessage = message;
    console.log('🤖 Processing message:', originalMessage);

    // Check if this is a Jira-related request
    const isJiraRequest = message.toLowerCase().includes('jira') || 
                         message.toLowerCase().includes('project') ||
                         message.toLowerCase().includes('list') && message.toLowerCase().includes('project');

    let finalResponse = '';
    let toolsUsed = [];
    let accumulatedContext = [];

    if (isJiraRequest) {
      console.log('🎯 Detected Jira request, calling Jira tools');
      
      try {
        // Call Jira tools to list projects
        const { data: jiraResult, error: jiraError } = await supabase.functions.invoke('jira-tools', {
          body: {
            action: 'list_projects',
            userId: userId
          }
        });

        if (jiraError) {
          console.error('Jira tools error:', jiraError);
          finalResponse = `I encountered an error accessing your Jira projects: ${jiraError.message}. Please make sure your Jira credentials are configured in the settings.`;
        } else if (jiraResult && jiraResult.success) {
          const projects = jiraResult.data;
          console.log('✅ Retrieved', projects?.length || 0, 'Jira projects');
          
          if (projects && projects.length > 0) {
            finalResponse = `Here are your current Jira projects:\n\n${projects.map((p: any, index: number) => 
              `${index + 1}. **${p.name}** (${p.key})\n   ${p.description || 'No description'}\n   Lead: ${p.lead || 'Not assigned'}`
            ).join('\n\n')}`;
            
            toolsUsed.push({
              name: 'execute_jira-tools',
              parameters: { action: 'list_projects' },
              result: projects,
              success: true
            });
          } else {
            finalResponse = 'No Jira projects found. You may need to configure your Jira credentials or check your permissions.';
          }
        } else {
          finalResponse = 'Unable to retrieve Jira projects. Please check your Jira configuration in the settings.';
        }

        accumulatedContext = [{
          iteration: 1,
          response: finalResponse,
          toolsUsed: toolsUsed
        }];
      } catch (error) {
        console.error('Error calling Jira tools:', error);
        finalResponse = `I encountered an error while trying to access your Jira projects: ${error.message}. Please ensure your Jira integration is properly configured.`;
        accumulatedContext = [{
          iteration: 1,
          response: finalResponse,
          toolsUsed: []
        }];
      }
    } else {
      // For non-Jira requests, use the existing learning loop logic
      const complexityDecision = await analyzeComplexity(originalMessage, conversationHistory || [], openai, supabase);
      
      const { finalResponse: loopResponse, accumulatedContext: loopContext, toolsUsed: loopTools } = await executeLearningLoop(
        originalMessage,
        conversationHistory || [],
        complexityDecision,
        openai,
        supabase
      );
      
      finalResponse = loopResponse;
      toolsUsed = loopTools;
      accumulatedContext = loopContext;
    }

    // Attempt to persist learning insights (with improved error handling)
    console.log('🧠 Attempting to persist learning insights...');
    try {
      const persistResult = await persistInsightAsKnowledgeNode(
        originalMessage,
        finalResponse,
        accumulatedContext,
        userId,
        { classification: isJiraRequest ? 'SIMPLE' : 'COMPLEX', reasoning: 'AI Agent processing' },
        supabaseAdmin // Use admin client for knowledge persistence
      );
      
      if (persistResult) {
        console.log('✅ Learning insights persisted successfully');
      } else {
        console.log('ℹ️ No significant insights to persist or already exists');
      }
    } catch (persistError) {
      console.error('❌ Learning insights persistence failed:', persistError);
      // Don't fail the main request - just log the error
      console.log('❌ Learning insights persistence failed or skipped');
    }

    // Construct the successful response
    const responseData = {
      success: true,
      message: finalResponse,
      toolsUsed: toolsUsed,
      aiReasoning: isJiraRequest ? 'Detected Jira request and used Jira tools' : 'Used general AI processing'
    };

    console.log('✅ Sending successful response');
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ AI Agent Error:', error);
    
    const errorResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred',
      message: 'I apologize, but I encountered an error processing your request. Please try again.'
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
