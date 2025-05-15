
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Configure CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get the Supabase URL from environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
if (!supabaseUrl) {
  console.error("Missing SUPABASE_URL environment variable");
}

interface AIReasoningRequest {
  operation: 'generateTask' | 'solveTask' | 'verifySolution' | 'reflect' | 'mutateTask';
  task?: string; 
  solution?: string;
  verification?: string; 
  domain: string;
  domainContext?: string; // Additional context about the domain
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify we have the Supabase URL
    if (!supabaseUrl) {
      return new Response(
        JSON.stringify({ error: 'Supabase URL is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body
    const requestData: AIReasoningRequest = await req.json();
    const { operation, task, solution, verification, domain, domainContext } = requestData;
    
    console.log(`Processing ${operation} operation for domain: ${domain}`);
    
    // Construct the system message based on domain and operation
    let systemPrompt = `You are an expert in ${domain}. `;
    
    // Add domain-specific context if provided
    if (domainContext) {
      systemPrompt += domainContext + " ";
    }
    
    // Add operation-specific instructions
    switch (operation) {
      case 'generateTask':
        systemPrompt += "Generate a challenging but solvable task related to this domain. Make it specific enough to be educational.";
        break;
      case 'solveTask':
        systemPrompt += "Solve the provided task thoroughly, explaining your approach and reasoning.";
        break;
      case 'verifySolution':
        systemPrompt += "Verify if the solution correctly addresses the task. Be critical and point out any errors or omissions.";
        break;
      case 'reflect':
        systemPrompt += "Reflect on the task, solution, and verification process. Extract key insights and learning points.";
        break;
      case 'mutateTask':
        systemPrompt += "Based on the current task and learning, create a new related task that builds upon the insights gained.";
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation specified' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Construct user message based on operation and provided data
    let userMessage = "";
    switch (operation) {
      case 'generateTask':
        userMessage = `Generate a challenging task for the ${domain} domain.`;
        break;
      case 'solveTask':
        userMessage = `Task: ${task}\n\nPlease solve this task.`;
        break;
      case 'verifySolution':
        userMessage = `Task: ${task}\n\nSolution: ${solution}\n\nPlease verify if this solution is correct.`;
        break;
      case 'reflect':
        userMessage = `Task: ${task}\n\nSolution: ${solution}\n\nVerification: ${verification}\n\nPlease reflect on the key insights from this learning loop.`;
        break;
      case 'mutateTask':
        userMessage = `Based on this task: ${task}\n\nCreate a related but different task that builds on the same concepts.`;
        break;
    }

    console.log("Sending request to AI model proxy");
    
    // Make the API call to our model proxy instead of directly to OpenAI
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-model-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // This will be used by OpenAI but ignored by local models
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    // Check for API errors
    if (!response.ok) {
      const error = await response.json();
      console.error("AI model proxy error:", error);
      return new Response(
        JSON.stringify({ error: `AI model error: ${error.error?.message || 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and return the response
    const data = await response.json();
    const result = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
