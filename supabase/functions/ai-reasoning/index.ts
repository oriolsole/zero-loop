
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ReasoningRequest = {
  action: 'generateTask' | 'solveTask' | 'verifySolution' | 'reflect' | 'mutateTask';
  domain: string;
  task?: string;
  solution?: string;
  verification?: string;
  previousSteps?: string[];
  context?: any;
};

type ReasoningResponse = {
  result: string;
  metadata?: {
    confidence?: number;
    sources?: Array<{
      title: string;
      link: string;
      snippet: string;
      source: string;
    }>;
    reasoning?: string;
  };
};

// Get the OpenAI API key from environment variables
const apiKey = Deno.env.get('OPENAI_API_KEY');

// System prompts for different reasoning actions
const prompts = {
  generateTask: (domain: string) => 
    `You are an expert AI tutor in ${domain}. Create a challenging and insightful learning task in this domain. The task should be clear, thought-provoking, and test understanding of important concepts. Make it specific enough to have a verifiable solution.`,
  
  solveTask: (domain: string) => 
    `You are an expert in ${domain}. Solve the following task with detailed, step-by-step reasoning. Provide a comprehensive solution that shows your thought process.`,
  
  verifySolution: (domain: string) => 
    `You are an expert evaluator in ${domain}. Verify whether the solution to the given task is correct. Provide detailed reasoning for your verification. If there are errors, identify them specifically. If the solution is correct, explain why.`,
  
  reflect: (domain: string) => 
    `You are an expert at identifying patterns and insights. Reflect on the learning process of the task, solution, and verification. Extract key insights, patterns, or principles that could be applied to future problems. Focus on meta-learning - what can be learned about the learning process itself? Format your response with clear sections for different insights.`,
  
  mutateTask: (domain: string) => 
    `You are an expert AI tutor in ${domain}. Based on the previous task and how it was solved, create a new related task that builds upon the learning. If the previous task was solved successfully, make this one slightly more challenging. If it wasn't solved well, adjust to be more accessible while still teaching the same concepts. The new task should promote deeper understanding of the domain.`
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request
    const { action, domain, task, solution, verification, previousSteps, context } = await req.json() as ReasoningRequest;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured in environment variables');
    }

    if (!action || !domain) {
      throw new Error('Missing required fields: action and domain');
    }

    // Construct the prompt based on the action
    let systemPrompt = prompts[action](domain);
    let messages = [
      { role: "system", content: systemPrompt }
    ];

    // Add relevant context based on the action type
    switch (action) {
      case 'generateTask':
        // For task generation, we just need the domain context
        messages.push({ 
          role: "user", 
          content: `Create a learning task in ${domain}.${context ? " Context: " + JSON.stringify(context) : ""}`
        });
        break;
      
      case 'solveTask':
        // For solving, we need the task
        if (!task) throw new Error('Task is required for solveTask action');
        messages.push({ 
          role: "user", 
          content: `Solve this task: ${task}`
        });
        break;
      
      case 'verifySolution':
        // For verification, we need the task and solution
        if (!task || !solution) throw new Error('Task and solution are required for verifySolution action');
        messages.push({ 
          role: "user", 
          content: `Task: ${task}\n\nSolution: ${solution}\n\nVerify if this solution is correct.`
        });
        break;
      
      case 'reflect':
        // For reflection, we need the task, solution, and verification
        if (!task || !solution || !verification) throw new Error('Task, solution, and verification are required for reflect action');
        messages.push({ 
          role: "user", 
          content: `Task: ${task}\n\nSolution: ${solution}\n\nVerification: ${verification}\n\nReflect on this learning process. What insights can be extracted?`
        });
        break;
      
      case 'mutateTask':
        // For mutation, we need the previous task and optionally previous steps
        if (!task) throw new Error('Task is required for mutateTask action');
        messages.push({ 
          role: "user", 
          content: `Previous task: ${task}\n${previousSteps ? "Previous steps: " + previousSteps.join("\n") : ""}\n\nCreate a new related task.`
        });
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Call the OpenAI API
    console.log(`Calling OpenAI API for action: ${action} in domain: ${domain}`);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using the more efficient model for cost reasons
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    // Calculate a mock confidence score - in a real implementation, 
    // this could be derived from the model's output or logprobs
    const confidence = 0.7 + (Math.random() * 0.3);

    // Prepare the response
    const reasoningResponse: ReasoningResponse = {
      result,
      metadata: {
        confidence,
        reasoning: "Generated using AI reasoning engine"
      }
    };

    return new Response(JSON.stringify(reasoningResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in ai-reasoning function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
